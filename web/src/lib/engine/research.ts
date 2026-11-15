// Pull: on-demand analysis grounded ONLY in primary documents (concall transcripts + annual
// report) and the reported numbers. Two model steps, routed by difficulty:
//   map    (cheap)  — per transcript: guidance statements with verbatim quotes, themes, analyst pushback
//   reduce (strong) — promised vs delivered against the actual numbers, narrative vs numbers, bull/bear
// Numbers are computed in code and handed to the model; the model is told not to use outside knowledge.
import { z } from "zod";
import { llmJSON, type LlmUsage } from "../llm";
import { pdfPages, fetchPdf, pdfTextFromUrl } from "../sources/pdf";
import type { ScreenerCompany } from "../sources/screener";
import { row } from "./fundamentals";

export const TranscriptExtract = z.object({
  quarter: z.string().describe("Quarter discussed, e.g. 'Q2 FY27'"),
  guidance: z
    .array(
      z.object({
        metric: z.string().describe("What is guided: revenue growth, EBITDA margin, capex, loan growth, credit cost, volume, etc."),
        target: z.string().describe("The number or range promised, normalised, e.g. '15–17% YoY', '₹2,000 Cr', 'stable'"),
        horizon: z.string().describe("By when, e.g. 'FY27', 'next 2 quarters', 'medium term'"),
        quote: z.string().describe("Verbatim sentence from the transcript, max 35 words"),
        speaker: z.string().nullable(),
      }),
    )
    .describe("Only explicit forward-looking commitments with a direction or number. Skip vague optimism."),
  themes: z.array(z.string()).describe("Management's 3–5 main narrative points this quarter, one line each"),
  analystConcerns: z.array(z.string()).describe("Up to 4 things analysts pushed back on, one line each"),
});

const ArExtract = z.object({
  what: z.string().describe("Two sentences: what the company does and how it makes money"),
  segments: z.array(z.object({ name: z.string(), detail: z.string().describe("share of revenue or key fact, as stated") })),
  strategy: z.array(z.string()).describe("Up to 4 stated strategic priorities"),
});

export const Narrative = z.object({
  read: z.string().describe("FINN's read in two sentences: the single most important thing about this company right now, citing a number."),
  promises: z
    .array(
      z.object({
        said: z.string().describe("Quarter/call where it was said, e.g. 'Q4 FY26 call'"),
        promise: z.string().describe("What was promised, short"),
        delivered: z.string().describe("What the numbers show, with the actual figure"),
        verdict: z.enum(["delivered", "partly", "missed", "pending", "unverifiable"]),
        quote: z.string().describe("Verbatim quote of the promise"),
      }),
    )
    .describe("4–8 most important guidance items across the calls, oldest first"),
  credibility: z.string().describe("One sentence on management's delivery record, e.g. 'Delivered 3 of 5 checkable promises; margin guidance missed twice.'"),
  narrativeVsNumbers: z
    .array(z.object({ claim: z.string(), reality: z.string(), aligned: z.boolean() }))
    .describe("2–4 places where management's story and the reported numbers agree or diverge"),
  bull: z.array(z.string()).describe("Exactly 3 tight bullet points, each with evidence"),
  bear: z.array(z.string()).describe("Exactly 3 tight bullet points, each with evidence"),
  askManagement: z.array(z.string()).describe("3 sharp questions to ask management or an expert"),
});

export type ResearchResult = {
  symbol: string;
  generatedAt: string;
  business: z.infer<typeof ArExtract> | null;
  narrative: z.infer<typeof Narrative>;
  sources: { label: string; url: string }[];
  usage: { calls: number; costUsd: number; models: string[] };
};

const MAP_SYSTEM = `You extract facts from Indian listed-company earnings-call transcripts for a portfolio manager.
Use ONLY the transcript text. Quotes must be verbatim. Do not use outside knowledge about the company.`;

const AR_SYSTEM = `You summarise the business-overview pages of an Indian company's annual report.
Use ONLY the provided text. Do not use outside knowledge.`;

const REDUCE_SYSTEM = `You are a sceptical buy-side analyst. You compare what management promised on earnings calls with what the reported numbers show.
Rules:
- Ground every statement in the provided extracts and the numbers table. Never use outside knowledge, news or broker views.
- A promise is "delivered" only if the numbers table shows it; "pending" if its horizon hasn't arrived; "unverifiable" if the table can't test it.
- Cite actual figures (₹ crore, %, quarter labels) wherever possible. Be concise and specific; no filler.`;

function numbersTable(co: ScreenerCompany, isLender: boolean) {
  const q = co.quarters;
  const n = q.headers.length;
  const take = Math.min(9, n);
  const cols = q.headers.slice(n - take);
  const lines = [`Quarter | ${cols.join(" | ")}`];
  const rows = isLender
    ? ["Revenue", "Financing Profit", "Financing Margin %", "Net Profit", "Gross NPA %"]
    : ["Sales", "Operating Profit", "OPM %", "Net Profit"];
  for (const r of rows) {
    const v = row(q, r);
    if (v) lines.push(`${r} | ${v.slice(n - take).map((x) => (x == null ? "–" : x)).join(" | ")}`);
  }
  const a = co.annual;
  const an = a.headers.length;
  const acols = a.headers.slice(Math.max(0, an - 6));
  lines.push("", `Year | ${acols.join(" | ")}`);
  for (const r of isLender ? ["Revenue", "Net Profit"] : ["Sales", "OPM %", "Net Profit"]) {
    const v = row(a, r);
    if (v) lines.push(`${r} | ${v.slice(Math.max(0, an - 6)).map((x) => (x == null ? "–" : x)).join(" | ")}`);
  }
  return lines.join("\n") + "\n(₹ crore unless %; quarters are calendar month-ends; Indian FY ends March, so 'Sep 2026' = Q2 FY27)";
}

export async function runResearch(
  co: ScreenerCompany,
  isLender: boolean,
  progress: (msg: string) => void = () => {},
): Promise<ResearchResult> {
  const usages: LlmUsage[] = [];
  const sources: ResearchResult["sources"] = [];
  const calls = co.concalls.filter((c) => c.transcript).slice(0, 4);

  progress(`Reading ${calls.length} earnings-call transcripts`);
  const extracts = (
    await Promise.all(
      calls.map(async (c) => {
        try {
          const { text } = await pdfTextFromUrl(c.transcript!, { maxPages: 40, maxChars: 48_000 });
          const { data, usage } = await llmJSON({
            tier: "cheap",
            system: MAP_SYSTEM,
            schema: TranscriptExtract,
            prompt: `Company: ${co.name}\nCall: ${c.period}\n\nTranscript:\n"""\n${text}\n"""`,
          });
          usages.push(usage);
          sources.push({ label: `Concall transcript, ${c.period}`, url: c.transcript! });
          progress(`Extracted guidance from the ${c.period} call`);
          return { period: c.period, ...data };
        } catch (e) {
          progress(`Skipped the ${c.period} transcript (${(e as Error).message.slice(0, 60)})`);
          return null;
        }
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x != null);

  let business: ResearchResult["business"] = null;
  const ar = co.annualReports[0];
  if (ar) {
    progress(`Reading the business overview in the ${ar.year} annual report`);
    try {
      const data = await fetchPdf(ar.url);
      const { pages } = await pdfPages(data, { from: 1, maxPages: 28 });
      const text = pages.join("\n\n").slice(0, 40_000);
      const r = await llmJSON({ tier: "cheap", system: AR_SYSTEM, schema: ArExtract, prompt: `Company: ${co.name}\n\nAnnual report pages:\n"""\n${text}\n"""` });
      usages.push(r.usage);
      business = r.data;
      sources.push({ label: `Annual report ${ar.year}`, url: ar.url });
    } catch (e) {
      progress(`Annual report unavailable (${(e as Error).message.slice(0, 60)})`);
    }
  }

  if (!extracts.length) throw new Error("No transcripts could be read for this company");

  progress("Checking promises against reported numbers");
  const { data: narrative, usage } = await llmJSON({
    tier: "strong",
    system: REDUCE_SYSTEM,
    schema: Narrative,
    prompt: [
      `Company: ${co.name} (${co.symbol})${isLender ? " — a lender: judge growth, margins and asset quality, not EBITDA" : ""}`,
      "",
      "REPORTED NUMBERS",
      numbersTable(co, isLender),
      "",
      "EARNINGS-CALL EXTRACTS (oldest first)",
      JSON.stringify([...extracts].reverse(), null, 0),
      business ? `\nANNUAL REPORT (business overview)\n${JSON.stringify(business)}` : "",
    ].join("\n"),
  });
  usages.push(usage);

  return {
    symbol: co.symbol,
    generatedAt: new Date().toISOString(),
    business,
    narrative,
    sources,
    usage: {
      calls: usages.length,
      costUsd: +usages.reduce((s, u) => s + u.costUsd, 0).toFixed(4),
      models: [...new Set(usages.map((u) => u.model))],
    },
  };
}
