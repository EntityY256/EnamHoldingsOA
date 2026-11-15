"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABEL } from "@/lib/engine/classify";
import type { FeedItem } from "@/lib/feed";
import { Delta, Tag, timeAgo } from "../ui";
import { WhoToCall } from "../WhoToCall";

const CAT_TONE: Partial<Record<FeedItem["cat"], "accent" | "warn" | "down" | "up" | "net">> = {
  results: "accent",
  management_change: "warn",
  "M&A": "accent",
  litigation: "down",
  capex: "up",
  fund_raise: "warn",
  pledging: "down",
};

export function FeedCard({ item, now, alert }: { item: FeedItem; now: string; alert?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rise rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <header className="flex items-center gap-2 text-[12px]">
        <Link href={`/research/${item.symbol}`} className="num font-semibold text-ink underline decoration-line underline-offset-4">
          {item.symbol}
        </Link>
        <Tag tone={CAT_TONE[item.cat] ?? "muted"}>{CATEGORY_LABEL[item.cat]}</Tag>
        {alert && <Tag tone="down">● {alert}</Tag>}
        <span className="ml-auto text-faint">{timeAgo(item.ts, now)}</span>
      </header>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{item.title}</h3>
      {item.summary ? (
        <p className="mt-1 text-[14px] leading-snug text-ink-2">{item.summary}</p>
      ) : (
        <p className="mt-1 text-[13px] text-muted">
          {item.company} · {item.why}
        </p>
      )}

      {item.results && <ResultsGrid r={item.results} />}

      {item.people?.map((p) => (
        <div key={p.name} className="mt-3 rounded-xl bg-surface-2 p-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-semibold">{p.name}</span>
            <span className="text-[12px] text-muted">
              {p.action} · {p.role}
              {p.effective ? ` · from ${p.effective}` : ""}
            </span>
          </div>
          {p.bio && <p className="mt-1 text-[13px] leading-snug text-ink-2">{p.bio}</p>}
          {p.roles.length > 0 && (
            <ol className="mt-2 space-y-0.5 border-l border-line pl-3 text-[12px] text-ink-2">
              {p.roles.slice(0, 4).map((r, i) => (
                <li key={i}>
                  <span className="font-medium text-ink">{r.org}</span> · {r.title}
                  {r.from ? <span className="num text-muted"> {r.from}–{r.to ?? "now"}</span> : null}
                </li>
              ))}
            </ol>
          )}
          {p.education.length > 0 && <p className="mt-1.5 text-[12px] text-muted">{p.education.map((e) => `${e.school}${e.year ? ` '${String(e.year).slice(2)}` : ""}`).join(" · ")}</p>}
          {p.links.length > 0 ? (
            <WhoToCall links={p.links} title={`Your path to ${p.name.split(" ")[0]}`} compact />
          ) : (
            <p className="mt-2 text-[12px] text-muted">No one in your network overlaps with {p.name.split(" ")[0]}&apos;s career yet.</p>
          )}
        </div>
      ))}

      {item.who && item.who.length > 0 && !item.people?.some((p) => p.links.length) && (
        <WhoToCall links={item.who} title={item.cat === "results" ? "Sense-check with" : "Who to call"} compact />
      )}

      <footer className="mt-3 flex items-center gap-3 text-[12px] text-muted">
        {item.pdfUrl && (
          <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-accent">
            Filing ↗
          </a>
        )}
        <Link href={`/research/${item.symbol}`} className="font-medium text-ink-2">
          Research {item.symbol} →
        </Link>
        {item.related.length > 0 && (
          <button onClick={() => setOpen(!open)} className="ml-auto text-muted">
            {open ? "Hide" : `+${item.related.length} related`}
          </button>
        )}
      </footer>
      {open && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-[12px]">
          {item.related.map((r) => (
            <li key={r.id} className="flex gap-2">
              <span className="text-faint">{timeAgo(r.ts, now)}</span>
              {r.pdfUrl ? (
                <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent">
                  {r.title}
                </a>
              ) : (
                <span className="text-ink-2">{r.title}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ResultsGrid({ r }: { r: NonNullable<FeedItem["results"]> }) {
  return (
    <div className="mt-3 rounded-xl bg-surface-2 p-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 gap-y-1.5 text-[13px]">
        <span className="text-[11px] text-muted">₹ Cr · {r.period}</span>
        <span className="text-right text-[11px] text-muted">Now</span>
        <span className="text-right text-[11px] text-muted">QoQ</span>
        <span className="text-right text-[11px] text-muted">YoY</span>
        {r.metrics.map((m) => (
          <Row key={m.key} label={m.label} cur={m.cur} qoq={m.qoq} yoy={m.yoyPct} />
        ))}
        {r.margin && r.margin.cur != null && (
          <>
            <span className="text-ink-2">{r.margin.label}</span>
            <span className="num text-right">{r.margin.cur}%</span>
            <span className="text-right">
              <Delta v={r.margin.prev != null ? (r.margin.cur - r.margin.prev) * 100 : null} bp />
            </span>
            <span className="text-right">
              <Delta v={r.margin.yoy != null ? (r.margin.cur - r.margin.yoy) * 100 : null} bp />
            </span>
          </>
        )}
      </div>
      {r.take && <p className="mt-2.5 border-t border-line pt-2 text-[12px] text-ink-2">{r.take}</p>}
      <p className="mt-1 text-[10px] text-faint">
        vs {r.prevPeriod} (QoQ) and {r.yoyPeriod} (YoY) ·{" "}
        {r.source === "filing"
          ? "read from the results filing by FINN; EBITDA = PBT + finance cost + D&A − other income"
          : `standardised by screener.in${r.verified ? " · ✓ matches the filing" : ""}`}
      </p>
    </div>
  );
}

function Row({ label, cur, qoq, yoy }: { label: string; cur: number | null; qoq: number | null; yoy: number | null }) {
  return (
    <>
      <span className="text-ink-2">{label}</span>
      <span className="num text-right font-medium">{cur == null ? "—" : cur.toLocaleString("en-IN")}</span>
      <span className="text-right">
        <Delta v={qoq} />
      </span>
      <span className="text-right">
        <Delta v={yoy} />
      </span>
    </>
  );
}
