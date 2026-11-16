import { buildFeed } from "../../src/lib/feed";
const items = buildFeed();
for (const i of items.filter((x) => x.results)) {
  const r = i.results!;
  console.log(`${i.symbol.padEnd(11)} ${i.tier.padEnd(7)} src=${r.source}${r.verified ? " ✓" : ""} ${r.period} | ` + r.metrics.map((m) => `${m.label} ${m.cur} (QoQ ${m.qoq ?? "–"}%, YoY ${m.yoy ?? "–"}%)`).join(" · "));
}
console.log("\nSummaries:", items.filter((x) => x.summary).length, "/", items.length, "cards");
for (const i of items.filter((x) => x.tier === "act").slice(0, 12)) console.log(`- [${i.symbol}] ${i.title}\n    ${i.summary ?? "(no summary)"}`);
