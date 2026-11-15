import type { Category, Tier } from "./engine/classify";
import type { Bar } from "./sources/yahoo";
import type { ScreenerCompany } from "./sources/screener";

export type { Category, Tier, Bar, ScreenerCompany };

export type CompanyMeta = {
  symbol: string;
  name: string;
  bseCode: string | null;
  screenerId: string;
  sector: ScreenerCompany["sector"];
  marketCapCr: number | null;
  price: number | null;
  inPortfolio: boolean;
  isLender: boolean; // banks/NBFCs: EBITDA isn't meaningful, show operating profit instead
};

export type Filing = {
  id: string;
  symbol: string;
  ts: string;
  bseCategory: string;
  bseSub: string;
  subject: string;
  headline: string;
  pdfUrl: string | null;
  critical: boolean;
  cat: Category;
  tier: Tier;
  senior?: boolean;
  why: string;
  hasText?: boolean; // extracted PDF text stored in data/snapshot/texts/<id>.txt
};

export type Snapshot = {
  generatedAt: string;
  from: string;
  companies: CompanyMeta[];
  filings: Filing[];
  eod: Record<string, Bar[]>;
};
