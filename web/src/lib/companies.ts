// Company loader: the committed snapshot for the demo set, live screener.in for any other NSE ticker.
import fs from "node:fs";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { getCompany, type ScreenerCompany } from "./sources/screener";
import type { ResearchResult } from "./engine/research";

const SNAP = path.join(process.cwd(), "data", "snapshot");

export function isLenderCo(co: ScreenerCompany) {
  return "Financing Profit" in co.quarters.rows || /bank|nbfc|microfinance|housing finance|non banking/i.test(Object.values(co.sector).join(" "));
}

export function snapshotCompany(symbol: string): ScreenerCompany | null {
  const p = path.join(SNAP, "companies", `${symbol}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}

async function liveCompany(symbol: string): Promise<ScreenerCompany> {
  "use cache";
  cacheLife("days");
  cacheTag(`company-${symbol}`);
  return getCompany(symbol);
}

export async function loadCompany(symbol: string): Promise<ScreenerCompany> {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9&-]/g, "");
  return snapshotCompany(s) ?? liveCompany(s);
}

export function precomputedResearch(symbol: string): ResearchResult | null {
  for (const dir of [path.join(SNAP, "research"), "/tmp/finn-research"]) {
    const p = path.join(dir, `${symbol}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return null;
}
