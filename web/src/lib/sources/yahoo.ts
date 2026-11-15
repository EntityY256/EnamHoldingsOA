// End-of-day price & volume from Yahoo Finance's public chart endpoint (NSE tickers use ".NS").
import { fetchWithRetry } from "./http";

export type Bar = { d: string; c: number; v: number; h: number; l: number };

export async function getDailyBars(nseSymbol: string, range: "3mo" | "6mo" | "1y" = "6mo"): Promise<Bar[]> {
  const ticker = encodeURIComponent(`${nseSymbol}.NS`);
  const res = await fetchWithRetry(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`,
  );
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r?.timestamp) return [];
  const q = r.indicators.quote[0];
  const bars: Bar[] = [];
  (r.timestamp as number[]).forEach((t, i) => {
    if (q.close[i] == null || q.volume[i] == null) return;
    // Yahoo stamps NSE bars at 09:15 IST; shift to IST before taking the date.
    const d = new Date((t + 5.5 * 3600) * 1000).toISOString().slice(0, 10);
    bars.push({ d, c: +q.close[i].toFixed(2), v: q.volume[i], h: +q.high[i].toFixed(2), l: +q.low[i].toFixed(2) });
  });
  return bars;
}
