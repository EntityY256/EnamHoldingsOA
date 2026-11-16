/** Appends this run's LLM usage to data/snapshot/llm-ledger.json, so every script's spend is on record. */
import fs from "node:fs";
import path from "node:path";
import { usageLedger } from "../src/lib/llm";

export function appendLedger(script: string) {
  const led = usageLedger();
  const total = led.reduce((s, u) => s + u.costUsd, 0);
  const ledgerPath = path.resolve(__dirname, "..", "data", "snapshot", "llm-ledger.json");
  const prev = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { runs: [] };
  prev.runs.push({
    script,
    at: new Date().toISOString(),
    calls: led.length,
    cachedCalls: led.filter((u) => u.cached).length,
    inputTokens: led.reduce((s, u) => s + u.inputTokens, 0),
    outputTokens: led.reduce((s, u) => s + u.outputTokens, 0),
    costUsd: +total.toFixed(4),
    models: [...new Set(led.map((u) => u.model))],
  });
  fs.writeFileSync(ledgerPath, JSON.stringify(prev, null, 1));
  return { calls: led.length, cached: led.filter((u) => u.cached).length, total };
}
