import { buildFeed } from "../../src/lib/feed";
const items = buildFeed().filter((i) => i.tier !== "routine");
const bad = items.filter((i) => /attached|^general$|^press release|regulation 30|^intimation|^disclosure/i.test(i.title));
console.log(`non-routine ${items.length}, still generic-looking: ${bad.length}`);
for (const i of bad.slice(0, 12)) console.log(`  ${i.symbol.padEnd(10)} ${i.cat.padEnd(15)} ${i.title.slice(0, 110)}`);
console.log("\nsample know:"); for (const i of items.filter((x) => x.tier === "know").slice(0, 12)) console.log(`  ${i.symbol.padEnd(10)} ${i.title.slice(0, 120)}`);
