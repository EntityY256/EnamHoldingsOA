import Link from "next/link";
import { TickerSearch } from "@/components/research/TickerSearch";
import { SectionTitle, Sparkline, Tag } from "@/components/ui";
import { shortName, snapshot } from "@/lib/feed";
import { precomputedResearch } from "@/lib/companies";

export default function ResearchHome() {
  const research = snapshot.companies.filter((c) => !c.inPortfolio || ["TCS"].includes(c.symbol));
  const research_ = snapshot.companies.filter((c) => !c.inPortfolio);
  const portfolio = snapshot.companies.filter((c) => c.inPortfolio);
  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),20px)]">
      <p className="text-[12px] text-muted">Research</p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">What does the company say, and does it add up?</h1>
      <p className="mt-2 text-[13px] text-muted">
        Grounded only in annual reports, concall transcripts and reported numbers. No news, no broker notes. Works for any NSE ticker.
      </p>
      <TickerSearch />

      <SectionTitle>Research list</SectionTitle>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {[...research_, ...research.filter((c) => c.inPortfolio)].map((c) => (
          <Row key={c.symbol} symbol={c.symbol} name={shortName(c.name)} sub={c.sector.industry ?? ""} ready={!!precomputedResearch(c.symbol)} />
        ))}
      </ul>

      <SectionTitle>Portfolio</SectionTitle>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {portfolio.map((c) => (
          <Row key={c.symbol} symbol={c.symbol} name={shortName(c.name)} sub={c.sector.industry ?? ""} closes={snapshot.eod[c.symbol]?.slice(-30).map((b) => b.c)} ready={!!precomputedResearch(c.symbol)} />
        ))}
      </ul>
    </main>
  );
}

function Row({ symbol, name, sub, closes, ready }: { symbol: string; name: string; sub: string; closes?: number[]; ready?: boolean }) {
  return (
    <li>
      <Link href={`/research/${symbol}`} className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="num text-[13px] font-semibold">{symbol}</span>
            {ready && <Tag tone="accent">analysed</Tag>}
          </div>
          <p className="truncate text-[12px] text-muted">
            {name} · {sub}
          </p>
        </div>
        {closes && <Sparkline values={closes} />}
        <span className="text-faint">›</span>
      </Link>
    </li>
  );
}
