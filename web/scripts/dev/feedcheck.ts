// Dev sanity check: what does the Brief show, and does network matching find the right people?
import { buildFeed, network } from "../../src/lib/feed";

const items = buildFeed();
const by = (t: string) => items.filter((i) => i.tier === t);
console.log("items", items.length, "act", by("act").length, "know", by("know").length, "routine", by("routine").length);
for (const i of by("act").slice(0, 16))
  console.log(
    `${i.ts.slice(5, 16)} ${i.symbol.padEnd(10)} ${i.cat.padEnd(17)} +${i.related.length} | ${i.title.slice(0, 80)}` +
      (i.results ? ` | RESULTS ${i.results.period} ${i.results.take}` : "") +
      (i.who?.length ? ` | who: ${i.who.map((w) => `${w.name}(${w.kind})`).join(", ")}` : ""),
  );
console.log("\nKNOW sample:");
for (const i of by("know").slice(0, 8)) console.log(`  ${i.symbol.padEnd(10)} ${i.cat.padEnd(15)} ${i.title.slice(0, 90)}`);
console.log("\nROUTINE sample:");
for (const i of by("routine").slice(0, 6)) console.log(`  ${i.symbol.padEnd(10)} ${i.cat.padEnd(15)} ${i.title.slice(0, 90)}`);

const bagchi = network.linksToPerson({
  name: "Anup Bagchi",
  roles: [
    { org: "ICICI Securities", title: "MD & CEO", from: 2011, to: 2017 },
    { org: "ICICI Bank", title: "Executive Director", from: 2017, to: 2023 },
  ],
  education: [
    { school: "Indian Institute of Management, Bangalore", to: 1992 },
    { school: "Indian Institute of Technology, Kanpur", to: 1990 },
  ],
});
console.log("\nAnup Bagchi paths:");
for (const l of bagchi.slice(0, 4)) console.log(`  ${l.contact.name} [${l.kind} ${l.score.toFixed(1)}] ${l.reason}`);
console.log("\nKAYNES who-to-call:");
for (const l of network.linksToCompany("KAYNES", { industry: "Industrial Products", broadIndustry: "Industrial Manufacturing" }).slice(0, 3))
  console.log(`  ${l.contact.name} [${l.kind}] ${l.reason}`);
