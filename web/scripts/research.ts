/**
 * Pre-computes the Pull analysis for the research list so the demo opens instantly.
 * The live app runs the exact same pipeline (src/lib/engine/research.ts) for any other ticker.
 *
 *   ANTHROPIC_API_KEY=... npx tsx scripts/research.ts            # all research symbols
 *   ANTHROPIC_API_KEY=... npx tsx scripts/research.ts DIXON TCS  # specific ones
 */
import fs from "node:fs";
import path from "node:path";
import { isLenderCo, snapshotCompany } from "../src/lib/companies";
import { runResearch } from "../src/lib/engine/research";
import { llmProvider } from "../src/lib/llm";
import { getCompany } from "../src/lib/sources/screener";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "snapshot", "research");

async function main() {
  if (!llmProvider()) {
    console.error("No LLM key. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "portfolio.json"), "utf8"));
  const symbols: string[] = process.argv.slice(2).length ? process.argv.slice(2) : cfg.research;
  let total = 0;
  for (const s of symbols) {
    console.log(`\n${s}`);
    const co = snapshotCompany(s) ?? (await getCompany(s));
    try {
      const r = await runResearch(co, isLenderCo(co), (m) => console.log(`  · ${m}`));
      fs.writeFileSync(path.join(OUT, `${s}.json`), JSON.stringify(r, null, 1));
      total += r.usage.costUsd;
      console.log(`  ✓ ${r.narrative.promises.length} promises checked · $${r.usage.costUsd} · ${r.usage.models.join(" + ")}`);
    } catch (e) {
      console.log(`  ✗ ${(e as Error).message}`);
    }
  }
  console.log(`\nTotal: $${total.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
