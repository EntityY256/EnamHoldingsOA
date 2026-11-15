// Deterministic financial analysis from the standardised statements. Numbers are computed
// in code, never by a model: the LLM only writes narrative on top of these facts.
import type { ScreenerCompany, Table } from "../sources/screener";

export type Series = { labels: string[]; values: (number | null)[] };

export function row(t: Table, prefix: string): (number | null)[] | null {
  const k = Object.keys(t.rows).find((x) => x.toLowerCase().startsWith(prefix.toLowerCase()));
  return k ? t.rows[k] : null;
}

/** Drop a trailing "TTM" column so year-on-year maths uses fiscal years only. */
function fiscal(t: Table) {
  const ttm = t.headers[t.headers.length - 1] === "TTM";
  return { headers: ttm ? t.headers.slice(0, -1) : t.headers, cut: ttm ? -1 : undefined };
}

export function series(t: Table, prefix: string, opts: { fiscalOnly?: boolean } = {}): Series | null {
  const r = row(t, prefix);
  if (!r) return null;
  if (!opts.fiscalOnly) return { labels: t.headers, values: r };
  const f = fiscal(t);
  return { labels: f.headers, values: r.slice(0, f.cut) };
}

/** Round for display without printing "-0". */
const r0 = (x: number) => String(Math.round(x) || 0);

export const pct = (cur: number | null, base: number | null) =>
  cur == null || base == null || base === 0 ? null : ((cur - base) / Math.abs(base)) * 100;

function cagr(s: Series | null, years: number): number | null {
  if (!s) return null;
  const v = s.values;
  const end = v[v.length - 1];
  const start = v[v.length - 1 - years];
  if (end == null || start == null || start <= 0 || end <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

const last = <T,>(a: (T | null)[] | null | undefined) => {
  if (!a) return null;
  for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i];
  return null;
};
const sum = (a: (number | null)[]) => a.reduce<number>((s, x) => s + (x ?? 0), 0);

// ---------------------------------------------------------------- results (Push card)

export type MetricKey = "revenue" | "ebitda" | "pbt" | "pat";
export type ResultsCut = {
  period: string;
  prevPeriod: string;
  yoyPeriod: string;
  metrics: { key: MetricKey; label: string; cur: number | null; prev: number | null; yoy: number | null; qoq: number | null; yoyPct: number | null }[];
  margin?: { label: string; cur: number | null; prev: number | null; yoy: number | null };
  take: string; // one deterministic sentence
  source: "screener" | "filing";
  verified?: boolean; // true when the filing extract and the standardised table agree on PAT
};

type Triple = { cur: number | null; prev: number | null; yoy: number | null };
export type FilingResults = {
  basis: string;
  unit: "crore" | "lakh" | "million" | "thousand";
  quarter: string;
  prevQuarter: string;
  yoyQuarter: string;
  revenue: Triple;
  otherIncome: Triple;
  financeCost: Triple;
  depreciation: Triple;
  pbt: Triple;
  pat: Triple;
};

/** Build the results cut from numbers extracted out of the filing itself. EBITDA is computed here. */
export function resultsFromFiling(x: FilingResults, isLender: boolean): ResultsCut {
  const k = { crore: 1, lakh: 0.01, million: 0.1, thousand: 0.0001 }[x.unit] ?? 1;
  const cr = (v: number | null) => (v == null ? null : +(v * k).toFixed(2));
  const t = (tr: Triple) => ({ cur: cr(tr.cur), prev: cr(tr.prev), yoy: cr(tr.yoy) });
  const ebitdaOf = (p: "cur" | "prev" | "yoy") => {
    const pbt = x.pbt[p];
    if (pbt == null) return null;
    return cr(pbt + (x.financeCost[p] ?? 0) + (x.depreciation[p] ?? 0) - (x.otherIncome[p] ?? 0));
  };
  const rev = t(x.revenue);
  const ebitda = { cur: ebitdaOf("cur"), prev: ebitdaOf("prev"), yoy: ebitdaOf("yoy") };
  const rows: { key: MetricKey; label: string; v: Triple }[] = [
    { key: "revenue", label: "Revenue", v: rev },
    ...(isLender ? [] : [{ key: "ebitda" as const, label: "EBITDA", v: ebitda }]),
    { key: "pbt", label: "PBT", v: t(x.pbt) },
    { key: "pat", label: "PAT", v: t(x.pat) },
  ];
  const metrics = rows.map((r) => ({ key: r.key, label: r.label, ...r.v, qoq: pct(r.v.cur, r.v.prev), yoyPct: pct(r.v.cur, r.v.yoy) }));
  const m = (p: "cur" | "prev" | "yoy") => (rev[p] && ebitda[p] != null ? +((ebitda[p]! / rev[p]!) * 100).toFixed(1) : null);
  const margin = isLender ? undefined : { label: "EBITDA margin", cur: m("cur"), prev: m("prev"), yoy: m("yoy") };
  return { period: x.quarter, prevPeriod: x.prevQuarter, yoyPeriod: x.yoyQuarter, metrics, margin, take: takeLine(metrics, margin), source: "filing" };
}

function takeLine(metrics: ResultsCut["metrics"], margin?: ResultsCut["margin"]) {
  const rev = metrics.find((m) => m.key === "revenue");
  const pat = metrics.find((m) => m.key === "pat");
  const parts: string[] = [];
  if (rev?.yoyPct != null) parts.push(`Revenue ${rev.yoyPct >= 0 ? "up" : "down"} ${Math.abs(rev.yoyPct).toFixed(0)}% YoY`);
  if (pat?.yoyPct != null) parts.push(`PAT ${pat.yoyPct >= 0 ? "up" : "down"} ${Math.abs(pat.yoyPct).toFixed(0)}%`);
  if (margin?.cur != null && margin.yoy != null && Math.round(margin.cur - margin.yoy) !== 0) {
    const bp = Math.round((margin.cur - margin.yoy) * 100);
    parts.push(`margin ${bp > 0 ? "+" : ""}${bp} bp`);
  }
  if (rev?.yoyPct != null && pat?.yoyPct != null && Math.sign(rev.yoyPct) !== Math.sign(pat.yoyPct))
    parts.push(pat.yoyPct < 0 ? "growth not reaching the bottom line" : "profit rising on falling sales");
  return parts.join(" · ");
}

export function resultsCut(co: ScreenerCompany, isLender: boolean): ResultsCut | null {
  const q = co.quarters;
  const n = q.headers.length;
  if (n < 5) return null;
  const i = n - 1;
  const at = (prefix: string) => {
    const r = row(q, prefix);
    return r ? { cur: r[i], prev: r[i - 1], yoy: r[i - 4] } : { cur: null, prev: null, yoy: null };
  };
  const defs: { key: MetricKey; label: string; prefix: string }[] = isLender
    ? [
        { key: "revenue", label: "Revenue", prefix: "Revenue" },
        { key: "ebitda", label: "Operating profit", prefix: "Financing Profit" },
        { key: "pbt", label: "PBT", prefix: "Profit before tax" },
        { key: "pat", label: "PAT", prefix: "Net Profit" },
      ]
    : [
        { key: "revenue", label: "Revenue", prefix: "Sales" },
        { key: "ebitda", label: "EBITDA", prefix: "Operating Profit" },
        { key: "pbt", label: "PBT", prefix: "Profit before tax" },
        { key: "pat", label: "PAT", prefix: "Net Profit" },
      ];
  const metrics = defs.map((d) => {
    const v = at(d.prefix);
    return { key: d.key, label: d.label, ...v, qoq: pct(v.cur, v.prev), yoyPct: pct(v.cur, v.yoy) };
  });
  const m = at(isLender ? "Financing Margin" : "OPM");
  const margin = { label: isLender ? "Financing margin" : "EBITDA margin", ...m };
  return { period: q.headers[i], prevPeriod: q.headers[i - 1], yoyPeriod: q.headers[i - 4], metrics, margin, take: takeLine(metrics, margin), source: "screener" };
}

// ---------------------------------------------------------------- research (Pull view)

export type Signal = { tone: "good" | "bad" | "neutral"; text: string };

export type Fundamentals = {
  isLender: boolean;
  snapshot: { label: string; value: string; sub?: string }[];
  trajectory: { revenue: Series | null; opm: Series | null; pat: Series | null; quarterlyRevenue: Series | null; quarterlyPat: Series | null; signals: Signal[] };
  balanceSheet: { borrowings: Series | null; netWorth: Series | null; debtToEquity: Series | null; wcDays: Series | null; ccc: Series | null; signals: Signal[] };
  cash: { cfo: Series | null; pat: Series | null; fcf: Series | null; conversion5y: number | null; signals: Signal[] };
};

const fmtCr = (v: number | null) =>
  v == null ? "—" : Math.abs(v) >= 1e5 ? `₹${(v / 1e5).toFixed(2)} L Cr` : `₹${Math.round(v).toLocaleString("en-IN")} Cr`;
const fmtPct = (v: number | null, d = 0) => (v == null ? "—" : `${v.toFixed(d)}%`);

export function analyse(co: ScreenerCompany, isLender: boolean): Fundamentals {
  const a = co.annual;
  const revenue = series(a, isLender ? "Revenue" : "Sales", { fiscalOnly: true });
  const opm = series(a, isLender ? "Financing Margin" : "OPM", { fiscalOnly: true });
  const pat = series(a, "Net Profit", { fiscalOnly: true });
  const ttmRev = a.headers.at(-1) === "TTM" ? row(a, isLender ? "Revenue" : "Sales")?.at(-1) ?? null : last(revenue?.values);
  const ttmPat = a.headers.at(-1) === "TTM" ? row(a, "Net Profit")?.at(-1) ?? null : last(pat?.values);

  const g3 = cagr(revenue, 3);
  const g5 = cagr(revenue, 5);
  const p3 = cagr(pat, 3);
  const p5 = cagr(pat, 5);

  const trajSignals: Signal[] = [];
  if (g3 != null && g5 != null) {
    trajSignals.push(
      g3 > g5 + 3
        ? { tone: "good", text: `Revenue growth accelerating: ${r0(g3)}% 3-yr CAGR vs ${r0(g5)}% over 5 yrs` }
        : g3 < g5 - 3
          ? { tone: "bad", text: `Revenue growth slowing: ${r0(g3)}% 3-yr CAGR vs ${r0(g5)}% over 5 yrs` }
          : { tone: "neutral", text: `Steady revenue growth: ~${r0(g3)}% a year over 3 and 5 yrs` },
    );
  }
  if (p3 != null && g3 != null) {
    if (p3 > g3 + 3) trajSignals.push({ tone: "good", text: `Profit compounding faster than sales (${r0(p3)}% vs ${r0(g3)}% 3-yr CAGR): operating leverage` });
    else if (p3 < g3 - 3) trajSignals.push({ tone: "bad", text: `Profit lagging sales (${r0(p3)}% vs ${r0(g3)}% 3-yr CAGR): margins under pressure` });
  }
  if (opm) {
    const v = opm.values.filter((x): x is number => x != null);
    if (v.length >= 4) {
      const now = v[v.length - 1];
      const avg = v.slice(-4, -1).reduce((s, x) => s + x, 0) / 3;
      // Negative "margins" (some lenders' standardised format) don't read as margins; skip them.
      if (Math.abs(now - avg) >= 2 && now > 0 && avg > 0)
        trajSignals.push({
          tone: now > avg ? "good" : "bad",
          text: `${isLender ? "Financing" : "Operating"} margin ${now > avg ? "expanding" : "compressing"}: ${now.toFixed(0)}% latest vs ${avg.toFixed(0)}% prior 3-yr average`,
        });
    }
  }

  // Balance sheet
  const bs = co.balanceSheet;
  const eq = row(bs, "Equity Capital");
  const res = row(bs, "Reserves");
  const borrow = row(bs, "Borrowing");
  const netWorthVals = eq && res ? eq.map((e, i) => (e == null || res[i] == null ? null : e + res[i]!)) : null;
  const de = borrow && netWorthVals ? borrow.map((b, i) => (b == null || !netWorthVals[i] ? null : +(b / netWorthVals[i]!).toFixed(2))) : null;
  const wc = series(co.ratios, "Working Capital Days");
  const ccc = series(co.ratios, "Cash Conversion Cycle");
  const bsSignals: Signal[] = [];
  const deNow = last(de);
  if (!isLender && deNow != null) {
    const de3 = de && de.length > 3 ? de[de.length - 4] : null;
    bsSignals.push(
      deNow < 0.1
        ? { tone: "good", text: `Effectively debt-free (D/E ${deNow.toFixed(2)})` }
        : deNow > 1
          ? { tone: "bad", text: `Leveraged: D/E ${deNow.toFixed(2)}${de3 != null ? ` (was ${de3.toFixed(2)} three years ago)` : ""}` }
          : { tone: "neutral", text: `Moderate leverage: D/E ${deNow.toFixed(2)}${de3 != null ? ` (was ${de3.toFixed(2)})` : ""}` },
    );
  }
  if (ccc && ccc.values.filter((x) => x != null).length >= 4) {
    const v = ccc.values;
    const now = last(v)!;
    const then = v[v.length - 4];
    if (then != null && Math.abs(now - then) >= 10)
      bsSignals.push({
        tone: now > then ? "bad" : "good",
        text: `Cash conversion cycle ${now > then ? "lengthening" : "shortening"}: ${Math.round(now)} days vs ${Math.round(then)} three years ago`,
      });
  }

  // Cash quality
  const cf = co.cashFlow;
  const cfo = series(cf, "Cash from Operating");
  const fcf = series(cf, "Free Cash Flow");
  const patAligned = pat && cfo ? { labels: cfo.labels, values: cfo.labels.map((l) => pat.values[pat.labels.indexOf(l)] ?? null) } : null;
  let conversion5y: number | null = null;
  const cashSignals: Signal[] = [];
  if (cfo && patAligned && !isLender) {
    const c5 = cfo.values.slice(-5);
    const p5v = patAligned.values.slice(-5);
    const sp = sum(p5v);
    if (sp > 0) conversion5y = (sum(c5) / sp) * 100;
    if (conversion5y != null)
      cashSignals.push(
        conversion5y >= 90
          ? { tone: "good", text: `Profits are real cash: 5-yr operating cash flow is ${conversion5y.toFixed(0)}% of reported profit` }
          : conversion5y >= 60
            ? { tone: "neutral", text: `Partial cash conversion: 5-yr CFO is ${conversion5y.toFixed(0)}% of profit` }
            : { tone: "bad", text: `Weak cash conversion: only ${conversion5y.toFixed(0)}% of 5-yr profit arrived as operating cash` },
      );
    const negFcf = (fcf?.values.slice(-5) ?? []).filter((x) => x != null && x < 0).length;
    if (negFcf >= 3) cashSignals.push({ tone: "bad", text: `Free cash flow negative in ${negFcf} of the last 5 years: growth is being funded externally or from the balance sheet` });
  }
  if (isLender) cashSignals.push({ tone: "neutral", text: "For lenders, operating cash flow mostly reflects loan-book movements, so cash conversion isn't a meaningful test." });

  const roce = co.topRatios["ROCE"];
  const roe = co.topRatios["ROE"];
  const snapshot = [
    { label: isLender ? "Revenue (TTM)" : "Sales (TTM)", value: fmtCr(ttmRev), sub: g3 != null ? `${fmtPct(g3)} 3-yr CAGR` : undefined },
    { label: "Net profit (TTM)", value: fmtCr(ttmPat), sub: p3 != null ? `${fmtPct(p3)} 3-yr CAGR` : undefined },
    { label: isLender ? "Financing margin" : "Operating margin", value: fmtPct(last(opm?.values) ?? null), sub: "latest FY" },
    { label: isLender ? "ROE" : "ROCE", value: (isLender ? roe : roce) ?? "—", sub: isLender ? undefined : roe ? `ROE ${roe}` : undefined },
    { label: "Market cap", value: fmtCr(co.marketCapCr), sub: co.topRatios["Stock P/E"] ? `P/E ${co.topRatios["Stock P/E"]}` : undefined },
    ...(isLender
      ? [{ label: "Gross NPA", value: fmtPct(last(row(co.quarters, "Gross NPA")), 2), sub: `Net ${fmtPct(last(row(co.quarters, "Net NPA")), 2)}` }]
      : [{ label: "Debt / equity", value: deNow == null ? "—" : deNow.toFixed(2), sub: conversion5y != null ? `CFO/PAT ${conversion5y.toFixed(0)}% (5y)` : undefined }]),
  ];

  const qRev = series(co.quarters, isLender ? "Revenue" : "Sales");
  const qPat = series(co.quarters, "Net Profit");

  return {
    isLender,
    snapshot,
    trajectory: { revenue, opm, pat, quarterlyRevenue: qRev, quarterlyPat: qPat, signals: trajSignals },
    balanceSheet: {
      borrowings: borrow ? { labels: bs.headers, values: borrow } : null,
      netWorth: netWorthVals ? { labels: bs.headers, values: netWorthVals } : null,
      debtToEquity: de ? { labels: bs.headers, values: de } : null,
      wcDays: wc,
      ccc,
      signals: bsSignals,
    },
    cash: { cfo, pat: patAligned, fcf, conversion5y, signals: cashSignals },
  };
}
