import Link from "next/link";
import { Suspense } from "react";
import { NarrativePanel } from "@/components/research/NarrativePanel";
import { Bars, SectionTitle, Tag } from "@/components/ui";
import { WhoToCall } from "@/components/WhoToCall";
import { isLenderCo, loadCompany, precomputedResearch } from "@/lib/companies";
import { analyse, type Series, type Signal } from "@/lib/engine/fundamentals";
import { network, shortName, snapshot, type LinkLite } from "@/lib/feed";
import { llmProvider } from "@/lib/llm";
import type { ScreenerCompany } from "@/lib/types";

export function generateStaticParams() {
  return snapshot.companies.map((c) => ({ symbol: c.symbol }));
}

export default function Page({ params }: PageProps<"/research/[symbol]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Research params={params} />
    </Suspense>
  );
}

async function Research({ params }: { params: PageProps<"/research/[symbol]">["params"] }) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  let co: ScreenerCompany;
  try {
    co = await loadCompany(symbol);
  } catch (e) {
    return (
      <main className="px-4 pt-10">
        <Link href="/research" className="text-[13px] text-muted">
          ‹ Research
        </Link>
        <h1 className="mt-4 text-[22px] font-semibold">Couldn&apos;t load {symbol}</h1>
        <p className="mt-2 text-[14px] text-muted">{(e as Error).message}. Check the NSE symbol and try again.</p>
      </main>
    );
  }
  const lender = isLenderCo(co);
  const f = analyse(co, lender);
  const meta = snapshot.companies.find((c) => c.symbol === co.symbol);
  const bars = snapshot.eod[co.symbol];
  const last = bars?.at(-1);
  const prev = bars?.at(-2);
  const dayChg = last && prev ? ((last.c - prev.c) / prev.c) * 100 : null;
  const links: LinkLite[] = network
    .linksToCompany(co.symbol, co.sector)
    .slice(0, 4)
    .map((l) => ({ contactId: l.contact.id, name: l.contact.name, headline: l.contact.headline, kind: l.kind, reason: l.reason, score: l.score, months: network.monthsSince(l.contact.tie.lastContact), strength: l.contact.tie.strength }));

  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <Link href="/research" className="text-[13px] text-muted">
        ‹ Research
      </Link>
      <header className="mt-3">
        <div className="flex items-center gap-2">
          <span className="num text-[13px] font-semibold">{co.symbol}</span>
          {meta?.inPortfolio && <Tag tone="accent">In portfolio</Tag>}
          <span className="text-[12px] text-muted">{co.sector.industry}</span>
        </div>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight">{shortName(co.name)}</h1>
        <p className="num mt-1 text-[14px] text-ink-2">
          ₹{(last?.c ?? co.price)?.toLocaleString("en-IN")}
          {dayChg != null && <span className={dayChg >= 0 ? "text-up" : "text-down"}> {dayChg >= 0 ? "+" : ""}{dayChg.toFixed(2)}%</span>}
          <span className="text-muted"> · {last ? `close ${last.d}` : "latest"}</span>
        </p>
      </header>

      <NarrativePanel symbol={co.symbol} initial={precomputedResearch(co.symbol)} llmReady={llmProvider() != null} about={co.about} keyPoints={co.keyPoints} />

      <SectionTitle>Financial snapshot</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {f.snapshot.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-3">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className="num mt-0.5 text-[18px] font-semibold">{s.value}</div>
            {s.sub && <div className="mt-0.5 text-[11px] text-muted">{s.sub}</div>}
          </div>
        ))}
      </div>

      <SectionTitle>Trajectory</SectionTitle>
      <Card>
        <Chart title={lender ? "Revenue, ₹ Cr" : "Sales, ₹ Cr"} s={f.trajectory.revenue} />
        <Chart title="Net profit, ₹ Cr" s={f.trajectory.pat} />
        <Chart title={lender ? "Financing margin %" : "Operating margin %"} s={f.trajectory.opm} />
        <Chart title="Last 13 quarters: net profit" s={f.trajectory.quarterlyPat} />
        <Signals list={f.trajectory.signals} />
      </Card>

      <SectionTitle>Balance sheet</SectionTitle>
      <Card>
        {!lender && <Chart title="Debt / equity" s={f.balanceSheet.debtToEquity} decimals />}
        <Chart title="Borrowings, ₹ Cr" s={f.balanceSheet.borrowings} />
        {f.balanceSheet.ccc && <Chart title="Cash conversion cycle, days" s={f.balanceSheet.ccc} />}
        {!f.balanceSheet.ccc && f.balanceSheet.wcDays && <Chart title="Working capital days" s={f.balanceSheet.wcDays} />}
        <Signals list={f.balanceSheet.signals} />
      </Card>

      <SectionTitle>Cash quality</SectionTitle>
      <Card>
        <Chart title="Cash from operations, ₹ Cr" s={f.cash.cfo} />
        <Chart title="Free cash flow, ₹ Cr" s={f.cash.fcf} />
        <Signals list={f.cash.signals} />
      </Card>

      <SectionTitle right={<span className="text-[11px] text-net">private to you</span>}>Who can help</SectionTitle>
      {links.length ? (
        <WhoToCall links={links} title={`People who know ${co.symbol}`} />
      ) : (
        <p className="rounded-xl border border-dashed border-line p-4 text-[13px] text-muted">No one in your network has worked at {shortName(co.name)}, its peers, or this sector yet.</p>
      )}

      <SectionTitle>Sources</SectionTitle>
      <ul className="space-y-1.5 text-[13px]">
        {co.annualReports.slice(0, 3).map((a) => (
          <li key={a.url}>
            <a className="text-accent" href={a.url} target="_blank" rel="noopener noreferrer">
              Annual report {a.year} ↗
            </a>
          </li>
        ))}
        {co.concalls
          .filter((c) => c.transcript)
          .slice(0, 4)
          .map((c) => (
            <li key={c.transcript}>
              <a className="text-accent" href={c.transcript} target="_blank" rel="noopener noreferrer">
                Concall transcript, {c.period} ↗
              </a>
            </li>
          ))}
        <li>
          <a className="text-muted" href={co.url} target="_blank" rel="noopener noreferrer">
            Standardised statements: screener.in ↗
          </a>
        </li>
      </ul>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 rounded-2xl border border-line bg-surface p-4">{children}</div>;
}

function Chart({ title, s, decimals }: { title: string; s: Series | null; decimals?: boolean }) {
  if (!s || s.values.every((v) => v == null)) return null;
  const vals = s.values.slice(-10);
  const labels = s.labels.slice(-10);
  const lastV = [...vals].reverse().find((v) => v != null);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] text-muted">{title}</span>
        <span className="num text-[13px] font-semibold">{lastV == null ? "—" : decimals ? lastV.toFixed(2) : Math.round(lastV).toLocaleString("en-IN")}</span>
      </div>
      <Bars values={vals} labels={labels} />
      <div className="num mt-1 flex justify-between text-[10px] text-faint">
        <span>{labels[0]}</span>
        <span>{labels.at(-1)}</span>
      </div>
    </div>
  );
}

function Signals({ list }: { list: Signal[] }) {
  if (!list.length) return null;
  return (
    <ul className="space-y-1.5 border-t border-line pt-3">
      {list.map((s, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-snug">
          <span className={s.tone === "good" ? "text-up" : s.tone === "bad" ? "text-down" : "text-muted"}>{s.tone === "good" ? "▲" : s.tone === "bad" ? "▼" : "•"}</span>
          <span className="text-ink-2">{s.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return (
    <main className="animate-pulse px-4 pt-10">
      <div className="h-4 w-20 rounded bg-surface-2" />
      <div className="mt-4 h-8 w-2/3 rounded bg-surface-2" />
      <div className="mt-6 h-40 rounded-2xl bg-surface-2" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-2" />
        ))}
      </div>
    </main>
  );
}
