import { buildFeed, snapshot } from "../../src/lib/feed";
const items = buildFeed();
for (const h of [24, 72, 168, 720]) {
  const since = new Date(new Date(snapshot.generatedAt).getTime() - h * 3600e3);
  const w = items.filter((x) => new Date(x.ts) >= since);
  const filings = w.reduce((n, i) => n + 1 + i.related.length, 0);
  const act = w.filter((i) => i.tier === "act").length;
  console.log(`${h}h: ${filings} filings → ${w.length} cards; act ${act}, know ${w.filter((i) => i.tier === "know").length}, routine ${w.filter((i) => i.tier === "routine").length}`);
}
