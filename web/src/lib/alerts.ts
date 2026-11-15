// Threshold alerts on end-of-day data. The investor decides what "unusual" means.
import type { Bar } from "./sources/yahoo";
import type { Category } from "./engine/classify";

export type AlertSettings = {
  volumeMultiple: number; // e.g. 2 → volume ≥ 2× the 20-day average
  priceMovePct: number; // e.g. 4 → |daily close-to-close move| ≥ 4%
  watch: Category[]; // filing types that should interrupt me
};

export const DEFAULT_SETTINGS: AlertSettings = {
  volumeMultiple: 2,
  priceMovePct: 4,
  watch: ["results", "M&A", "management_change", "litigation", "capex", "fund_raise", "pledging"],
};

export type MarketAlert = {
  symbol: string;
  d: string;
  close: number;
  changePct: number;
  volMultiple: number;
  reasons: ("volume" | "price")[];
  closes: number[]; // last ~20 closes for a sparkline
};

export function marketAlerts(eod: Record<string, Bar[]>, s: AlertSettings, sinceDate: string): MarketAlert[] {
  const out: MarketAlert[] = [];
  for (const [symbol, bars] of Object.entries(eod)) {
    for (let i = 21; i < bars.length; i++) {
      const b = bars[i];
      if (b.d < sinceDate) continue;
      const prev = bars[i - 1];
      const avg = bars.slice(i - 20, i).reduce((x, y) => x + y.v, 0) / 20;
      const changePct = ((b.c - prev.c) / prev.c) * 100;
      const volMultiple = avg ? b.v / avg : 0;
      const reasons: MarketAlert["reasons"] = [];
      if (volMultiple >= s.volumeMultiple) reasons.push("volume");
      if (Math.abs(changePct) >= s.priceMovePct) reasons.push("price");
      if (reasons.length)
        out.push({ symbol, d: b.d, close: b.c, changePct, volMultiple, reasons, closes: bars.slice(Math.max(0, i - 19), i + 1).map((x) => x.c) });
    }
  }
  return out.sort((a, b) => b.d.localeCompare(a.d) || Math.abs(b.changePct) - Math.abs(a.changePct));
}
