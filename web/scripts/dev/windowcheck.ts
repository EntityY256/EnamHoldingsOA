import { buildFeed, snapshot } from "../../src/lib/feed";
const since = new Date(new Date(snapshot.generatedAt).getTime() - 24 * 3600e3);
const items = buildFeed();
console.log("since", since.toISOString());
for (const i of items.filter((x) => new Date(x.ts) >= since)) console.log(i.ts, i.symbol, i.cat, i.tier, i.title.slice(0, 60));
