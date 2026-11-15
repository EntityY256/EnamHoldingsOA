"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABEL, type Category } from "@/lib/engine/classify";
import { DEFAULT_SETTINGS, marketAlerts, type AlertSettings, type MarketAlert } from "@/lib/alerts";
import type { FeedItem } from "@/lib/feed";
import type { Bar } from "@/lib/sources/yahoo";
import { Delta, SectionTitle, Sparkline, Tag, timeAgo } from "../ui";
import { FeedCard } from "./FeedCard";
import { SettingsSheet } from "./SettingsSheet";

const WINDOWS = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "3d", label: "3 days", hours: 72 },
  { key: "7d", label: "Week", hours: 168 },
  { key: "30d", label: "Month", hours: 720 },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

export type WarmNudge = { contactId: string; name: string; months: number; connection: string; event: { symbol: string; label: string } };

export function Brief({ items, eod, asOf, warm, companies }: { items: FeedItem[]; eod: Record<string, Bar[]>; asOf: string; warm: WarmNudge[]; companies: number }) {
  const [win, setWin] = useState<WindowKey>("24h");
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("finn.settings");
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      const w = localStorage.getItem("finn.window") as WindowKey | null;
      if (w && WINDOWS.some((x) => x.key === w)) setWin(w);
    } catch {}
  }, []);
  const save = (s: AlertSettings) => {
    setSettings(s);
    try {
      localStorage.setItem("finn.settings", JSON.stringify(s));
    } catch {}
  };
  const pickWindow = (w: WindowKey) => {
    setWin(w);
    try {
      localStorage.setItem("finn.window", w);
    } catch {}
  };

  const hours = WINDOWS.find((w) => w.key === win)!.hours;
  const since = new Date(new Date(asOf).getTime() - hours * 3600e3);
  // EOD bars are dated by trading day; a 24h window on a Monday morning still means "last session".
  const sinceDate = new Date(since.getTime() - (hours <= 72 ? 2 : 0) * 864e5).toISOString().slice(0, 10);

  const view = useMemo(() => {
    const inWin = items.filter((i) => new Date(i.ts) >= since);
    const watched = new Set<Category>(settings.watch);
    const alerts = inWin.filter((i) => i.tier === "act" && watched.has(i.cat));
    const act = inWin.filter((i) => i.tier === "act" && !watched.has(i.cat));
    const know = inWin.filter((i) => i.tier === "know");
    const routine = inWin.filter((i) => i.tier === "routine");
    const byCat = new Map<Category, FeedItem[]>();
    for (const r of routine) byCat.set(r.cat, [...(byCat.get(r.cat) ?? []), r]);
    const filingCount = inWin.reduce((n, i) => n + 1 + i.related.length, 0);
    return { inWin, alerts, act, know, routine, byCat, filingCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, win, settings, asOf]);

  const moves = useMemo(() => marketAlerts(eod, settings, sinceDate), [eod, settings, sinceDate]);
  const material = view.alerts.length + view.act.length;
  const asOfLabel = new Date(asOf).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),20px)]">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-muted">Brief · as of {asOfLabel}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-[1.15] tracking-tight">
            {material === 0 && moves.length === 0 ? (
              <>Quiet {WINDOWS.find((w) => w.key === win)!.label.toLowerCase()}. Nothing needs you.</>
            ) : (
              <>
                {material + moves.length} thing{material + moves.length === 1 ? "" : "s"} need you.
                <span className="text-muted"> {view.filingCount - material} more handled.</span>
              </>
            )}
          </h1>
        </div>
        <button onClick={() => setShowSettings(true)} aria-label="Alert settings" className="mt-1 grid size-9 place-items-center rounded-full border border-line bg-surface text-ink-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
        </button>
      </header>
      <p className="mt-2 text-[13px] text-muted">
        {view.filingCount} filing{view.filingCount === 1 ? "" : "s"}
        {moves.length ? ` and ${moves.length} unusual price/volume move${moves.length === 1 ? "" : "s"}` : ""} across your {companies} companies. Routine paperwork is folded away; you decide what interrupts you.
      </p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            onClick={() => pickWindow(w.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${win === w.key ? "bg-ink text-bg" : "border border-line bg-surface text-ink-2"}`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {(view.alerts.length > 0 || moves.length > 0) && (
        <>
          <SectionTitle right={<span className="text-[11px] text-muted">crossed your thresholds</span>}>Alerts</SectionTitle>
          <div className="space-y-3">
            {view.alerts.map((i) => (
              <FeedCard key={i.id} item={i} now={asOf} alert="Watching" />
            ))}
            {moves.length > 0 && <Moves moves={moves} items={items} settings={settings} />}
          </div>
        </>
      )}

      {view.act.length > 0 && (
        <>
          <SectionTitle>Needs you</SectionTitle>
          <div className="space-y-3">
            {view.act.map((i) => (
              <FeedCard key={i.id} item={i} now={asOf} />
            ))}
          </div>
        </>
      )}

      {material === 0 && moves.length === 0 && win !== "30d" && (
        <button onClick={() => pickWindow(win === "24h" ? "7d" : "30d")} className="mt-6 w-full rounded-2xl border border-dashed border-line p-4 text-left text-[14px] text-ink-2">
          Nothing crossed a threshold. <span className="font-medium text-accent">Widen to the last {win === "24h" ? "week" : "month"} →</span>
        </button>
      )}

      {view.know.length > 0 && (
        <>
          <SectionTitle>Worth knowing</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {view.know.map((i) => (
              <li key={i.id} className="flex gap-3 px-4 py-3">
                <Link href={`/research/${i.symbol}`} className="num w-[72px] shrink-0 truncate pt-0.5 text-[12px] font-semibold">
                  {i.symbol}
                </Link>
                <div className="min-w-0 flex-1">
                  <a href={i.pdfUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="block text-[14px] leading-snug text-ink">
                    {i.summary ?? i.title}
                  </a>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {CATEGORY_LABEL[i.cat]} · {timeAgo(i.ts, asOf)}
                    {i.related.length ? ` · +${i.related.length} related` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {view.routine.length > 0 && (
        <>
          <SectionTitle>Routine</SectionTitle>
          <button onClick={() => setShowRoutine(!showRoutine)} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left">
            <div className="flex items-center justify-between text-[14px]">
              <span>
                {view.routine.length} routine filings <span className="text-muted">folded away</span>
              </span>
              <span className="text-muted">{showRoutine ? "−" : "+"}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...view.byCat.entries()].map(([c, l]) => (
                <Tag key={c}>
                  {CATEGORY_LABEL[c]} {l.length}
                </Tag>
              ))}
            </div>
          </button>
          {showRoutine && (
            <ul className="mt-2 space-y-1.5 px-1 text-[12px]">
              {view.routine.map((i) => (
                <li key={i.id} className="flex gap-2">
                  <span className="num w-[80px] shrink-0 truncate font-medium">{i.symbol}</span>
                  <a href={i.pdfUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex-1 text-ink-2">
                    {i.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {warm.length > 0 && (
        <>
          <SectionTitle right={<span className="text-[11px] text-net">from your network</span>}>Reasons to reconnect</SectionTitle>
          <ul className="space-y-2">
            {warm.slice(0, 3).map((w) => (
              <li key={w.contactId + w.event.symbol}>
                <Link href={`/network/${w.contactId}`} className="block rounded-2xl border border-net/20 bg-net-bg/50 px-4 py-3 text-[14px] leading-snug">
                  <span className="font-semibold text-net">{w.name}</span> {w.connection}, which just filed: <span className="text-ink">{w.event.label}</span>.
                  <span className="text-muted"> You last spoke {w.months} months ago.</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 px-1 text-center text-[11px] text-faint">
        Sources: BSE filings, Yahoo Finance EOD, screener.in. Network is a synthetic demo.
      </p>

      {showSettings && <SettingsSheet settings={settings} onChange={save} onClose={() => setShowSettings(false)} />}
    </main>
  );
}

function Moves({ moves, items, settings }: { moves: MarketAlert[]; items: FeedItem[]; settings: AlertSettings }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[11px] text-muted">
        <span>Market moves</span>
        <span>
          vol ≥ {settings.volumeMultiple}× 20-day avg · move ≥ ±{settings.priceMovePct}%
        </span>
      </div>
      <ul className="divide-y divide-line">
        {moves.slice(0, 6).map((m) => {
          // Any filing within a day either side is a candidate explanation for the move.
          const driver = items.find((i) => i.symbol === m.symbol && Math.abs(new Date(i.ts).getTime() - new Date(m.d + "T15:30:00+05:30").getTime()) < 36 * 3600e3 && i.tier !== "routine");
          return (
            <li key={m.symbol + m.d} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href={`/research/${m.symbol}`} className="num w-[86px] shrink-0 truncate text-[13px] font-semibold">
                  {m.symbol}
                </Link>
                <Sparkline values={m.closes} />
                <div className="ml-auto text-right">
                  <div className="text-[14px]">
                    <Delta v={m.changePct} digits={1} />
                  </div>
                  <div className={`num text-[11px] ${m.reasons.includes("volume") ? "text-warn" : "text-muted"}`}>{m.volMultiple.toFixed(1)}× vol</div>
                </div>
              </div>
              <p className="mt-1 text-[12px] text-muted">
                {new Date(m.d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                {driver ? (
                  <>
                    {" · likely driver: "}
                    <span className="text-ink-2">{driver.title}</span>
                  </>
                ) : (
                  " · no filing explains this. Worth a look."
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
