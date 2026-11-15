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
import { llmJSON, llmProvider, modelFor, usageLedger } from "../src/lib/llm";
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
  unit: z.enum(["crore", "lakh", "million", "thousand"]).describe("Unit the table states, e.g. '₹ in crore' → crore"),
  quarter: z.string().describe("Quarter just ended, e.g. 'Sep 2026'"),
  prevQuarter: z.string(),
  yoyQuarter: z.string(),
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

async function main() {
  if (!llmProvider()) {
    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY (free at aistudio.google.com).");
    process.exit(1);
  }
  console.log(`Provider: ${llmProvider()} · cheap model: ${modelFor("cheap")}`);
  const snap: Snapshot = JSON.parse(fs.readFileSync(path.join(SNAP, "feed.json"), "utf8"));
  const outPath = path.join(SNAP, "enrichments.json");
  const out: Record<string, z.infer<typeof Enrichment> & { model: string; results?: z.infer<typeof ResultsExtract> }> = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, "utf8"))
    : {};
  const names = new Map(snap.companies.map((c) => [c.symbol, c.name]));

  const todo = snap.filings.filter((f) => f.hasText && !out[f.id]);
  console.log(`${todo.length} filings to enrich (${Object.keys(out).length} already done)`);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const f = todo[i++];
      const text = fs.readFileSync(path.join(SNAP, "texts", `${f.id}.txt`), "utf8").slice(0, 14_000);
      try {
        const { data, usage } = await llmJSON({
          tier: "cheap",
          system: SYSTEM,
          schema: Enrichment,
          prompt: `Company: ${names.get(f.symbol)} (${f.symbol})\nBSE category: ${f.bseCategory} / ${f.bseSub}\nTitle: ${f.subject}\nHeadline: ${f.headline}\n\nFiling text:\n"""\n${text}\n"""`,
        });
        out[f.id] = { ...data, model: usage.model };
        if (f.cat === "results") {
          const r = await llmJSON({
            tier: "cheap",
            system: RESULTS_SYSTEM,
            schema: ResultsExtract,
            prompt: `Company: ${names.get(f.symbol)}\n\nResults filing text:\n"""\n${text}\n"""`,
          });
          out[f.id].results = r.data;
        }
        process.stdout.write(usage.cached ? "c" : ".");
      } catch (e) {
        process.stdout.write("x");
        console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

  const led = usageLedger();
  const total = led.reduce((s, u) => s + u.costUsd, 0);
  const ledgerPath = path.join(SNAP, "llm-ledger.json");
  const prev = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { runs: [] };
  prev.runs.push({
    script: "enrich",
    at: new Date().toISOString(),
    calls: led.length,
    cachedCalls: led.filter((u) => u.cached).length,
    inputTokens: led.reduce((s, u) => s + u.inputTokens, 0),
    outputTokens: led.reduce((s, u) => s + u.outputTokens, 0),
    costUsd: +total.toFixed(4),
    models: [...new Set(led.map((u) => u.model))],
  });
  fs.writeFileSync(ledgerPath, JSON.stringify(prev, null, 1));
  console.log(`\nDone. ${led.length} calls, $${total.toFixed(4)} (${led.filter((u) => u.cached).length} served from cache)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
