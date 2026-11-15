// POST /api/research/:symbol → NDJSON stream of progress lines, then the result.
// Works for any NSE ticker screener.in covers. Results are cached; a daily cap protects the bill.
import fs from "node:fs";
import { isLenderCo, loadCompany, precomputedResearch } from "@/lib/companies";
import { runResearch } from "@/lib/engine/research";
import { llmProvider } from "@/lib/llm";

export const maxDuration = 300;

const DAILY_LIMIT = Number(process.env.RESEARCH_DAILY_LIMIT ?? 25);
const runs = { day: "", count: 0 };

export async function POST(_req: Request, ctx: RouteContext<"/api/research/[symbol]">) {
  const symbol = (await ctx.params).symbol.toUpperCase().replace(/[^A-Z0-9&-]/g, "");
  const cached = precomputedResearch(symbol);
  if (cached) return Response.json({ result: cached, cached: true });
  if (!llmProvider()) {
    return Response.json({ error: "The narrative layer needs an LLM key on the server (ANTHROPIC_API_KEY or GEMINI_API_KEY)." }, { status: 503 });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (runs.day !== today) Object.assign(runs, { day: today, count: 0 });
  if (runs.count >= DAILY_LIMIT) return Response.json({ error: "Daily research budget reached for this demo. Try a cached company." }, { status: 429 });
  runs.count++;

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        send({ stage: "Fetching statements and document links from screener.in" });
        const co = await loadCompany(symbol);
        const result = await runResearch(co, isLenderCo(co), (stage) => send({ stage }));
        try {
          fs.mkdirSync("/tmp/finn-research", { recursive: true });
          fs.writeFileSync(`/tmp/finn-research/${symbol}.json`, JSON.stringify(result));
        } catch {}
        send({ result });
      } catch (e) {
        send({ error: (e as Error).message });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
