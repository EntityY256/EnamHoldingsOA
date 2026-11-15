import { buildFeed } from "../../src/lib/feed";
for (const i of buildFeed().filter((x) => x.people?.length))
  console.log(`${i.symbol.padEnd(10)} ${i.title.slice(0, 50).padEnd(50)} → ${i.people!.map((p) => `${p.name} [${p.action}: ${p.role.slice(0, 30)}] ${p.links.length ? "⇢ " + p.links[0].name + " (" + p.links[0].kind + ")" : ""}`).join(" | ")}`);
