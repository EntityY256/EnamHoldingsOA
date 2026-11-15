import { Brief, type WarmNudge } from "@/components/brief/Brief";
import { buildFeed, network, snapshot } from "@/lib/feed";
import { CATEGORY_LABEL } from "@/lib/engine/classify";

export default function Home() {
  const items = buildFeed();
  const portfolio = snapshot.companies.filter((c) => c.inPortfolio);
  // Ship only the last ~60 sessions of EOD data to the client.
  const eod = Object.fromEntries(Object.entries(snapshot.eod).map(([k, v]) => [k, v.slice(-60)]));

  // "Keep the network warm": material/notable events at companies where a quiet contact works or worked.
  const events = items
    .filter((i) => i.tier !== "routine")
    .map((i) => ({ symbol: i.symbol, label: `${CATEGORY_LABEL[i.cat].toLowerCase()}: ${i.title}`, ts: i.ts }));
  const warm: WarmNudge[] = network.keepWarm(events).map((w) => ({
    contactId: w.contact.id,
    name: w.contact.name,
    months: w.months,
    connection: w.connection,
    event: { symbol: w.event.symbol, label: w.event.label },
  }));

  return <Brief items={items} eod={eod} asOf={snapshot.generatedAt} warm={warm} companies={portfolio.length} />;
}
