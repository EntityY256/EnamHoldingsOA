"use client";
import { useState } from "react";
import type { ResearchResult } from "@/lib/engine/research";
import { SectionTitle, Tag } from "../ui";

const VERDICT: Record<string, { label: string; tone: "up" | "down" | "warn" | "muted" | "accent" }> = {
  delivered: { label: "Delivered", tone: "up" },
  ahead: { label: "Raised", tone: "up" },
  partly: { label: "Partly", tone: "warn" },
  missed: { label: "Missed", tone: "down" },
  pending: { label: "Pending", tone: "accent" },
  unverifiable: { label: "Can't verify", tone: "muted" },
};

export function NarrativePanel({ symbol, initial, llmReady, about, keyPoints }: { symbol: string; initial: ResearchResult | null; llmReady: boolean; about: string; keyPoints: string }) {
  const [res, setRes] = useState<ResearchResult | null>(initial);
  const [stages, setStages] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr(null);
    setStages([]);
    try {
      const r = await fetch(`/api/research/${encodeURIComponent(symbol)}`, { method: "POST" });
      if (r.headers.get("content-type")?.includes("application/json")) {
        const j = await r.json();
        if (j.result) setRes(j.result);
        else setErr(j.error ?? "Failed");
        return;
      }
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.stage) setStages((s) => [...s, msg.stage]);
          if (msg.result) setRes(msg.result);
          if (msg.error) setErr(msg.error);
        }
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!res) {
    return (
      <>
        <SectionTitle>Business</SectionTitle>
        <div className="rounded-2xl border border-line bg-surface p-4 text-[14px] leading-relaxed text-ink-2">
          <p>{about || "No description available."}</p>
          {keyPoints && <p className="mt-2 line-clamp-4 text-[13px] text-muted">{keyPoints}</p>}
        </div>
        <div className="mt-3 rounded-2xl border border-ink/10 bg-ink p-4 text-bg">
          <p className="text-[15px] font-semibold">Promised vs delivered</p>
          <p className="mt-1 text-[13px] opacity-80">
            FINN reads the last four concall transcripts and the annual report, pulls out every explicit promise, and checks each one against the reported numbers.
          </p>
          {busy ? (
            <ul className="mt-3 space-y-1 text-[13px]">
              {stages.map((s, i) => (
                <li key={i} className={i === stages.length - 1 ? "opacity-100" : "opacity-60"}>
                  {i === stages.length - 1 ? "◌ " : "✓ "}
                  {s}
                </li>
              ))}
              {!stages.length && <li className="opacity-70">◌ Starting…</li>}
            </ul>
          ) : (
            <button
              onClick={run}
              disabled={!llmReady}
              className="mt-3 w-full rounded-xl bg-bg py-2.5 text-[14px] font-semibold text-ink disabled:opacity-50"
            >
              {llmReady ? "Analyse transcripts (~1 min)" : "Needs an LLM key on the server"}
            </button>
          )}
          {err && <p className="mt-2 text-[12px] text-[#ffb4a8]">{err}</p>}
        </div>
      </>
    );
  }

  const n = res.narrative;
  const counts = n.promises.reduce<Record<string, number>>((m, p) => ((m[p.verdict] = (m[p.verdict] ?? 0) + 1), m), {});
  return (
    <>
      <div className="mt-4 rounded-2xl bg-ink p-4 text-bg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-60">FINN&apos;s read</p>
        <p className="mt-1.5 text-[16px] leading-snug">{n.read}</p>
      </div>

      {res.business && (
        <>
          <SectionTitle>Business</SectionTitle>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[14px] leading-relaxed text-ink-2">{res.business.what}</p>
            {res.business.segments.length > 0 && (
              <ul className="mt-3 space-y-1 text-[13px]">
                {res.business.segments.map((s) => (
                  <li key={s.name} className="flex justify-between gap-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-right text-muted">{s.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <SectionTitle right={<span className="text-[11px] text-muted">{res.sources.filter((s) => s.label.startsWith("Concall")).length} calls checked</span>}>Promised vs delivered</SectionTitle>
      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {Object.entries(counts).map(([v, c]) => (
            <Tag key={v} tone={VERDICT[v]?.tone ?? "muted"}>
              {VERDICT[v]?.label ?? v} {c}
            </Tag>
          ))}
        </div>
        <p className="px-4 pt-3 text-[13px] font-medium text-ink">{n.credibility}</p>
        <ol className="divide-y divide-line">
          {n.promises.map((p, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-medium leading-snug">{p.promise}</p>
                <Tag tone={VERDICT[p.verdict]?.tone ?? "muted"}>{VERDICT[p.verdict]?.label ?? p.verdict}</Tag>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{p.delivered}</p>
              <p className="mt-1.5 border-l-2 border-line pl-2 text-[12px] italic leading-snug text-muted">
                “{p.quote}” · {p.said}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <SectionTitle>Narrative vs numbers</SectionTitle>
      <ul className="space-y-2">
        {n.narrativeVsNumbers.map((x, i) => (
          <li key={i} className="rounded-2xl border border-line bg-surface p-3.5">
            <p className="text-[13px] text-muted">Management says</p>
            <p className="text-[14px] leading-snug">{x.claim}</p>
            <p className="mt-2 text-[13px] text-muted">The numbers say</p>
            <p className={`text-[14px] leading-snug ${x.aligned ? "text-up" : "text-down"}`}>
              {x.aligned ? "✓ " : "✗ "}
              {x.reality}
            </p>
          </li>
        ))}
      </ul>

      <SectionTitle>Bull vs bear</SectionTitle>
      <div className="grid gap-2">
        <div className="rounded-2xl border border-up/25 bg-up-bg/60 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-up">Bull</p>
          <ul className="mt-1.5 space-y-1.5 text-[14px] leading-snug">
            {n.bull.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-down/25 bg-down-bg/60 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-down">Bear</p>
          <ul className="mt-1.5 space-y-1.5 text-[14px] leading-snug">
            {n.bear.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>

      <SectionTitle>Ask management</SectionTitle>
      <ol className="list-decimal space-y-1.5 rounded-2xl border border-line bg-surface py-3 pl-9 pr-4 text-[14px] leading-snug">
        {n.askManagement.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ol>
      <p className="mt-2 px-1 text-[11px] text-faint">
        {res.usage.calls} model calls ({res.usage.models.join(" + ")}) · ${res.usage.costUsd.toFixed(3)} · generated {new Date(res.generatedAt).toLocaleDateString("en-IN")} · from primary documents only
      </p>
    </>
  );
}
