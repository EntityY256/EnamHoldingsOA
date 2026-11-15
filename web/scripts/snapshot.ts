/**
 * Builds the demo snapshot: company fundamentals (screener.in), exchange filings (BSE),
 * end-of-day prices (Yahoo) and the text of material filings. No LLM calls here.
 *
 *   npx tsx scripts/snapshot.ts            # uses cached raw responses where present
 *   npx tsx scripts/snapshot.ts --refresh  # re-fetch everything
 *
 * Output (committed): data/snapshot/feed.json, data/snapshot/companies/<SYM>.json,
 * data/snapshot/texts/<filingId>.txt. Raw responses go to data/cache/ (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import { getCompany, type ScreenerCompany } from "../src/lib/sources/screener";
import { getBseFilings, type BseFiling } from "../src/lib/sources/bse";
import { getDailyBars, type Bar } from "../src/lib/sources/yahoo";
import { pdfTextFromUrl } from "../src/lib/sources/pdf";
import { classify } from "../src/lib/engine/classify";
import type { CompanyMeta, Filing, Snapshot } from "../src/lib/types";

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const OUT = path.join(DATA, "snapshot");
const CACHE = path.join(DATA, "cache");
const REFRESH = process.argv.includes("--refresh");
const FROM = new Date("2026-10-01T00:00:00+05:30");

for (const d of [OUT, path.join(OUT, "companies"), path.join(OUT, "texts"), CACHE]) fs.mkdirSync(d, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const p = path.join(CACHE, key.replace(/[^\w.-]/g, "_") + ".json");
  if (!REFRESH && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  const v = await fn();
  fs.writeFileSync(p, JSON.stringify(v));
  await sleep(600); // be polite to public sources
  return v;
}

const LENDER = /bank|finance|nbfc|lending|housing finance|financial services/i;

// Filings worth reading in full: the ones FINN enriches (people, deals, capex, legal).
// "Worth knowing" items get read too, so each can carry a one-line summary instead of a BSE form title.
const NEEDS_TEXT = (f: Filing) =>
  f.pdfUrl &&
  ((f.cat === "management_change" && f.tier !== "routine") ||
    (["M&A", "capex", "litigation", "fund_raise", "pledging"].includes(f.cat) && f.tier === "act") ||
    (f.tier === "know" && !["earnings_call", "results"].includes(f.cat)) ||
    (f.cat === "results" && f.tier === "act"));

async function main() {
  const cfg = JSON.parse(fs.readFileSync(path.join(DATA, "portfolio.json"), "utf8")) as {
    portfolio: string[];
    research: string[];
  };
  const all = [...new Set([...cfg.portfolio, ...cfg.research])];
  const companies: CompanyMeta[] = [];
  const filings: Filing[] = [];
  const eod: Record<string, Bar[]> = {};

  for (const sym of all) {
    const inPortfolio = cfg.portfolio.includes(sym);
    process.stdout.write(`${sym.padEnd(11)} `);
    let co: ScreenerCompany;
    try {
      co = await cached(`screener_${sym}`, () => getCompany(sym));
    } catch (e) {
      console.log("screener FAILED", (e as Error).message);
      continue;
    }
    fs.writeFileSync(path.join(OUT, "companies", `${sym}.json`), JSON.stringify(co));
    const sectorText = Object.values(co.sector).join(" ");
    companies.push({
      symbol: sym,
      name: co.name,
      bseCode: co.bseCode,
      screenerId: co.screenerId,
      sector: co.sector,
      marketCapCr: co.marketCapCr,
      price: co.price,
      inPortfolio,
      isLender: LENDER.test(sectorText) || "Financing Profit" in co.quarters.rows,
    });
    process.stdout.write(`screener ok (${co.quarters.headers.length}q, ${co.concalls.length} concalls) `);

    if (inPortfolio) {
      try {
        eod[sym] = await cached(`yahoo_${sym}`, () => getDailyBars(sym, "6mo"));
        process.stdout.write(`eod ${eod[sym].length} `);
      } catch (e) {
        process.stdout.write(`eod FAILED ${(e as Error).message} `);
      }
      if (co.bseCode) {
        try {
          const raw = await cached<BseFiling[]>(`bse_${sym}`, () => getBseFilings(co.bseCode!, FROM));
          for (const r of raw) {
            const c = classify(r);
            filings.push({
              id: r.id,
              symbol: sym,
              ts: r.ts,
              bseCategory: r.category,
              bseSub: r.subcategory,
              subject: r.subject,
              headline: r.headline,
              pdfUrl: r.pdfUrl,
              critical: r.critical,
              ...c,
            });
          }
          process.stdout.write(`filings ${raw.length}`);
        } catch (e) {
          process.stdout.write(`bse FAILED ${(e as Error).message}`);
        }
      }
    }
    console.log();
  }

  // Pull the text of material filings so enrichment (LLM) and the app never need BSE live.
  const toRead = filings.filter(NEEDS_TEXT);
  console.log(`\nReading ${toRead.length} material filing PDFs…`);
  for (const f of toRead) {
    const p = path.join(OUT, "texts", `${f.id}.txt`);
    if (fs.existsSync(p) && !REFRESH) {
      f.hasText = true;
      continue;
    }
    try {
      // Results tables sit in the first few pages; other filings rarely need more than 12.
      const { text } = await pdfTextFromUrl(f.pdfUrl!, {
        maxPages: f.cat === "results" ? 6 : 12,
        maxChars: f.cat === "results" ? 24_000 : 16_000,
      });
      if (text.replace(/\[page \d+\]|\s/g, "").length > 80) {
        fs.writeFileSync(p, text);
        f.hasText = true;
      }
      process.stdout.write(".");
    } catch (e) {
      process.stdout.write("x");
      console.error(`\n  ${f.symbol} ${f.id}: ${(e as Error).message}`);
    }
    await sleep(400);
  }

  filings.sort((a, b) => b.ts.localeCompare(a.ts));
  const snap: Snapshot = { generatedAt: new Date().toISOString(), from: FROM.toISOString(), companies, filings, eod };
  fs.writeFileSync(path.join(OUT, "feed.json"), JSON.stringify(snap));
  const byTier = filings.reduce<Record<string, number>>((m, f) => ((m[f.tier] = (m[f.tier] ?? 0) + 1), m), {});
  console.log(`\nDone: ${companies.length} companies, ${filings.length} filings`, byTier);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
