import type { ReactNode } from "react";

export function Delta({ v, suffix = "%", digits = 0, bp }: { v: number | null | undefined; suffix?: string; digits?: number; bp?: boolean }) {
  if (v == null || !Number.isFinite(v)) return <span className="num text-faint">—</span>;
  const up = v > 0;
  const flat = Math.abs(v) < (bp ? 1 : 0.5);
  const text = bp ? `${up ? "+" : ""}${Math.round(v)} bp` : `${up ? "+" : ""}${v.toFixed(digits)}${suffix}`;
  return <span className={`num ${flat ? "text-muted" : up ? "text-up" : "text-down"}`}>{text}</span>;
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "net" | "up" | "down" | "warn" }) {
  const cls = {
    muted: "bg-surface-2 text-muted",
    accent: "bg-accent-bg text-accent",
    net: "bg-net-bg text-net",
    up: "bg-up-bg text-up",
    down: "bg-down-bg text-down",
    warn: "bg-warn-bg text-warn",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-7 flex items-baseline justify-between px-1">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {right}
    </div>
  );
}

export function fmtCr(v: number | null | undefined) {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

export function timeAgo(iso: string, now: string) {
  const s = (new Date(now).getTime() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, net }: { name: string; net?: boolean }) {
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${net ? "bg-net-bg text-net" : "bg-surface-2 text-ink-2"}`}
    >
      {initials(name)}
    </span>
  );
}

export function Strength({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-[2px]" aria-label={`tie strength ${n} of 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2.5 w-[3px] rounded-full ${i <= n ? "bg-net" : "bg-line"}`} />
      ))}
    </span>
  );
}

/** Tiny inline bar chart (no chart library needed). */
export function Bars({ values, labels, height = 44, highlightLast = true }: { values: (number | null)[]; labels?: string[]; height?: number; highlightLast?: boolean }) {
  const vals = values.map((v) => v ?? 0);
  const max = Math.max(...vals.map(Math.abs), 1);
  const hasNeg = vals.some((v) => v < 0);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={labels ? labels.map((l, i) => `${l}: ${values[i] ?? "n/a"}`).join(", ") : undefined}>
      {vals.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / max) * (hasNeg ? height / 2 : height));
        const last = highlightLast && i === vals.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col justify-end" style={{ height }} title={labels ? `${labels[i]}: ${values[i] ?? "n/a"}` : undefined}>
            <div
              className={`w-full rounded-[2px] ${v < 0 ? "bg-down/70" : last ? "bg-ink" : "bg-ink/25"}`}
              style={{ height: h, marginBottom: hasNeg && v >= 0 ? height / 2 : hasNeg ? height / 2 - h : 0 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ values, width = 64, height = 22, tone }: { values: number[]; width?: number; height?: number; tone?: "up" | "down" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * (height - 2) - 1}`).join(" ");
  const t = tone ?? (values[values.length - 1] >= values[0] ? "up" : "down");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={t === "up" ? "text-up" : "text-down"} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
