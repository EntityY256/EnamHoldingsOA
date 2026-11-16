/**
 * LLM enrichment of material filings (cheap tier: Claude Haiku 5.5 or Gemini Flash-Lite).
 *   - one-line "why it matters" summary + materiality
 *   - for management changes: who, which role, and their career/education AS STATED in the filing
 * Network matching on the extracted careers is done later, deterministically, in code.
 *
 *   ANTHROPIC_API_KEY=... npx tsx scripts/enrich.ts      (or GEMINI_API_KEY=...)
 *
 * Output: data/snapshot/enrichments.json and data/snapshot/llm-ledger.json. Cached per filing.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { LlmUnavailable, llmJSON, llmProvider, modelFor } from "../src/lib/llm";
import { appendLedger } from "./ledger";
import type { FilingResults } from "../src/lib/engine/fundamentals";
import type { Snapshot } from "../src/lib/types";

const ROOT = path.resolve(__dirname, "..");
const SNAP = path.join(ROOT, "data", "snapshot");

const Person = z.object({
  name: z.string().describe("Full name without honorifics"),
  role: z.string().describe("Role in this company, e.g. 'MD & CEO', 'Independent Director', 'CFO'"),
  action: z.enum(["appointed", "resigned", "retired", "reappointed", "ceased", "other"]),
  effective: z.string().nullable().describe("Effective date as written, e.g. '27 Oct 2026', or null"),
  bio: z.string().nullable().describe("At most two sentences on who they are, ONLY from the filing text; null if the filing has no profile"),
  roles: z
    .array(z.object({ org: z.string(), title: z.string(), from: z.number().int().nullable(), to: z.number().int().nullable() }))
    .describe("Prior and current employers stated in the filing, most recent first; years only if stated"),
  education: z.array(z.object({ school: z.string(), degree: z.string().nullable(), year: z.number().int().nullable() })),
});

const Enrichment = z.object({
  summary: z.string().describe("ONE plain-English sentence (max 28 words): what happened and why a shareholder should care. No regulation numbers, no boilerplate."),
  materiality: z.enum(["high", "medium", "low"]).describe("high = could move the stock or change the thesis; low = procedural"),
  people: z.array(Person).describe("Only for appointments/resignations of directors or senior management; otherwise empty"),
});

// Results filings: the three standard columns (this quarter, previous quarter, same quarter last
// year). We ask for the raw lines and compute EBITDA in code, so the model never does arithmetic.
const Triple = z.object({ cur: z.number().nullable(), prev: z.number().nullable(), yoy: z.number().nullable() });
const ResultsExtract = z.object({
  basis: z.enum(["consolidated", "standalone"]).describe("Prefer consolidated if both are present"),
  unit: z.string().describe("Unit the table states: one of crore, lakh, million, thousand"),
  quarter: z.string().nullable().describe("Quarter just ended, e.g. 'Sep 2026'; null if there is no results table"),
  prevQuarter: z.string().nullable(),
  yoyQuarter: z.string().nullable(),
  revenue: Triple.describe("Revenue from operations"),
  otherIncome: Triple,
  financeCost: Triple,
  depreciation: Triple.describe("Depreciation and amortisation expense"),
  pbt: Triple.describe("Profit before tax (after exceptional items)"),
  pat: Triple.describe("Net profit for the period"),
});

// Frozen system prompt → identical prefix on every call → prompt-cache hits.
const SYSTEM = `You read Indian stock-exchange filings (BSE/NSE, SEBI LODR Regulation 30 disclosures) for a portfolio manager.
Rules:
- Use ONLY the filing text provided. Never add facts from outside knowledge.
- Be concrete: amounts (₹ crore), counterparties, dates, roles. Prefer the substance over the form.
- If the filing is procedural (an intimation, a re-submission, a certificate), say so plainly and mark materiality low.
- For people: extract every director / KMP / senior-management change. Career years only if the text states them.`;

const RESULTS_SYSTEM = `You read the financial-results table of an Indian listed company's quarterly results filing.
Copy numbers exactly as printed for: the quarter just ended, the preceding quarter, and the corresponding quarter of the previous year.
Do not compute anything. Use null where a figure is absent. Negative numbers (losses) keep their sign.`;

/** The pages holding the P&L table (consolidated first), or null if the filing has none. */
function tablePages(text: string): string | null {
  const pages = text.split(/(?=\[page \d+\])/);
  const isTable = (p: string) => /before\s+(exceptional\s+items\s+and\s+)?tax/i.test(p) && /revenue from operations|total income|interest earned/i.test(p);
  const hits = pages.filter(isTable);
  if (!hits.length) return null;
  const ordered = [...hits.filter((p) => /consolidated/i.test(p)), ...hits.filter((p) => !/consolidated/i.test(p))];
  return ordered.slice(0, 3).join("\n").slice(0, 24_000);
}

/**
 * True if a number the model copied appears in the source table. Compared digit-for-digit per number
 * token, because PDF text mangles separators: "1,19074" (lost point), "79362,78" (comma as point),
 * "53,145.6928,738.39" (two cells glued). A rounded or computed figure still fails.
 */
function appearsIn(text: string, v: number | null): boolean {
  if (v == null) return true;
  const abs = Math.abs(v);
  const forms = [String(abs), abs.toFixed(2)].map((s) => s.replace(/\D/g, ""));
  for (const tok of text.match(/\d[\d.,]*/g) ?? []) {
    const d = tok.replace(/\D/g, "");
    const glued = (tok.match(/\./g) ?? []).length > 1;
    if (forms.some((f) => d === f || (glued && d.startsWith(f)))) return true;
  }
  return false;
}

/**
 * Catches column mix-ups the verbatim check can't (every number real, but from the wrong column):
 * in each column with a profit, PAT must be a plausible share of PBT.
 */
type Col = { cur: number | null; prev: number | null; yoy: number | null };
function columnsConsistent(pbt: Col, pat: Col): boolean {
  return (["cur", "prev", "yoy"] as const).every((k) => {
    const b = pbt[k];
    const a = pat[k];
    if (b == null || a == null || b <= 0) return true;
    const r = a / b;
    return r >= 0.3 && r <= 1.2;
  });
}

function normUnit(u: string): FilingResults["unit"] | null {
  if (/crore|\bcr\b/i.test(u)) return "crore";
  if (/lakh|lac/i.test(u)) return "lakh";
  if (/million|\bmn\b/i.test(u)) return "million";
  if (/thousand|'000/i.test(u)) return "thousand";
  return null;
}

async function main() {
  if (!llmProvider()) {
    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY (free at aistudio.google.com).");
    process.exit(1);
  }
  console.log(`Provider: ${llmProvider()} · cheap model: ${modelFor("cheap")}`);
  const snap: Snapshot = JSON.parse(fs.readFileSync(path.join(SNAP, "feed.json"), "utf8"));
  const outPath = path.join(SNAP, "enrichments.json");
  const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: FilingResults; noResultsTable?: boolean }> =
    fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
  const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));

  const needsResults = (f: Snapshot["filings"][number]) => f.cat === "results" && !out[f.id]?.results && !out[f.id]?.noResultsTable;
  const todo = snap.filings.filter((f) => f.hasText && (!out[f.id] || needsResults(f)));
  console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
  let i = 0;
  let stop = false;
  let done = 0;
  const worker = async () => {
    while (i < todo.length && !stop) {
      const f = todo[i++];
      const full = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8");
      try {
        let cached = true;
        if (!out[f.id]) {
          const { data, usage } = await llmJSON({
            tier: "cheap",
            system: SYSTEM,
            schema: Enrichment,
            prompt: `Company: ${names.get(f.symbol)} (${f.symbol})\nBSE category: ${f.bseCategory} / ${f.bseSub}\nTitle: ${f.subject}\nHeadline: ${f.headline}\n\nFiling text:\n"""\n${full.slice(0, 14_000)}\n"""`,
          });
          out[f.id] = { ...data, model: usage.model };
          cached = usage.cached;
        }
        if (needsResults(f)) {
          // Separate try: a filing without a usable results table still keeps its summary.
          try {
            const table = tablePages(full);
            if (!table) {
              out[f.id].noResultsTable = true; // a press release or notice: never extract numbers from prose
            } else {
              const r = await llmJSON({
                tier: "cheap",
                system: RESULTS_SYSTEM,
                schema: ResultsExtract,
                prompt: `Company: ${names.get(f.symbol)}\n\nResults table pages:\n"""\n${table}\n"""`,
              });
              const unit = normUnit(r.data.unit);
              // Keep only a complete table whose key figures appear verbatim in the filing.
              const copied = [r.data.revenue, r.data.pbt, r.data.pat].flatMap((t) => [t.cur, t.prev, t.yoy]);
              const ok =
                unit &&
                r.data.quarter &&
                r.data.revenue.cur != null &&
                r.data.pat.cur != null &&
                copied.every((v) => appearsIn(table, v)) &&
                columnsConsistent(r.data.pbt, r.data.pat);
              if (ok)
                out[f.id].results = {
                  ...r.data,
                  unit,
                  quarter: r.data.quarter!,
                  prevQuarter: r.data.prevQuarter ?? "prev. quarter",
                  yoyQuarter: r.data.yoyQuarter ?? "year-ago quarter",
                };
              else {
                out[f.id].noResultsTable = true;
                const missing = copied.filter((v) => !appearsIn(table, v));
                console.error(`\n  ${f.symbol} ${f.id}: dropped (unit ${r.data.unit}, quarter ${r.data.quarter}; ${missing.length ? `not found verbatim: ${missing.join(", ")}` : "PAT/PBT columns inconsistent"})`);
              }
            }
          } catch (e) {
            if (e instanceof LlmUnavailable) throw e;
            console.error(`\n  ${f.symbol} ${f.id}: no usable results table (${(e as Error).message.slice(0, 80)})`);
          }
        }
        process.stdout.write(cached ? "c" : ".");
        // Save as we go so a quota stop or crash keeps finished work.
        if (++done % 10 === 0) fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
      } catch (e) {
        if (e instanceof LlmUnavailable) stop = true;
        process.stdout.write("x");
        console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

  const run = appendLedger("enrich");
  console.log(`\nDone. ${run.calls} calls, $${run.total.toFixed(4)} (${run.cached} served from cache)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
