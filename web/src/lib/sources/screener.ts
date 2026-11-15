// screener.in: standardised financial tables, document links (annual reports, concall
// transcripts, results PDFs) and a per-company feed of exchange filings mirrored from BSE.
import * as cheerio from "cheerio";
import { fetchText, parseNum, SourceError } from "./http";

const BASE = "https://www.screener.in";

export type Table = {
  headers: string[]; // period labels, e.g. "Sep 2025" or "Mar 2026" or "TTM"
  rows: Record<string, (number | null)[]>; // label → values aligned with headers
};

export type Concall = { period: string; transcript?: string; ppt?: string; recording?: string };

export type ScreenerCompany = {
  symbol: string;
  screenerId: string;
  bseCode: string | null;
  name: string;
  consolidated: boolean;
  url: string;
  about: string;
  keyPoints: string;
  sector: { broadSector?: string; sector?: string; broadIndustry?: string; industry?: string };
  topRatios: Record<string, string>;
  marketCapCr: number | null;
  price: number | null;
  quarters: Table;
  quarterPdfs: { period: string; url: string }[];
  annual: Table; // profit & loss
  balanceSheet: Table;
  cashFlow: Table;
  ratios: Table;
  annualReports: { year: string; url: string }[];
  concalls: Concall[];
  creditRatings: { title: string; url: string; when: string }[];
};

export type RawAnnouncement = {
  title: string;
  url: string;
  ts: string; // ISO with +05:30
  summary: string;
};

function clean(s: string) {
  return s.replace(/\s+/g, " ").replace(/ /g, " ").trim();
}

function parseTable($: cheerio.CheerioAPI, sectionId: string): { table: Table; pdfs: { period: string; url: string }[] } {
  const section = $(`section#${sectionId}`);
  const tbl = section.find("table.data-table").first();
  const headers = tbl
    .find("thead th")
    .toArray()
    .slice(1)
    .map((th) => clean($(th).text()));
  const rows: Table["rows"] = {};
  const pdfs: { period: string; url: string }[] = [];
  tbl.find("tbody tr").each((_, tr) => {
    const tds = $(tr).find("td").toArray();
    if (!tds.length) return;
    const label = clean($(tds[0]).text()).replace(/\s*\+$/, "");
    if (label === "Raw PDF") {
      tds.slice(1).forEach((td, i) => {
        const href = $(td).find("a").attr("href");
        if (href) pdfs.push({ period: headers[i], url: href.startsWith("http") ? href : BASE + href });
      });
      return;
    }
    rows[label] = tds.slice(1).map((td) => parseNum(clean($(td).text())));
  });
  return { table: { headers, rows }, pdfs };
}

function docBlock($: cheerio.CheerioAPI, heading: string) {
  return $("#documents div.documents")
    .filter((_, el) => clean($(el).find("h3").first().text()).toLowerCase().startsWith(heading.toLowerCase()))
    .first();
}

export async function getCompany(symbol: string): Promise<ScreenerCompany> {
  const sym = encodeURIComponent(symbol.toUpperCase());
  // Prefer consolidated figures; fall back to standalone when the company doesn't report them.
  for (const consolidated of [true, false]) {
    const url = `${BASE}/company/${sym}/${consolidated ? "consolidated/" : ""}`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch (e) {
      if (e instanceof SourceError && e.status === 404) throw new SourceError(`Unknown ticker ${symbol}`, 404);
      throw e;
    }
    const $ = cheerio.load(html);
    const screenerId = $("[data-company-id]").first().attr("data-company-id");
    if (!screenerId) throw new SourceError(`Could not read screener page for ${symbol}`);
    const quarters = parseTable($, "quarters");
    if (consolidated && Object.keys(quarters.table.rows).length === 0) continue;

    const topRatios: Record<string, string> = {};
    $("#top-ratios li").each((_, li) => {
      topRatios[clean($(li).find(".name").text())] = clean($(li).find(".value").text());
    });
    const sector: ScreenerCompany["sector"] = {};
    $("#peers a[title]").each((_, a) => {
      const t = $(a).attr("title");
      const v = clean($(a).text());
      if (t === "Broad Sector") sector.broadSector = v;
      if (t === "Sector") sector.sector = v;
      if (t === "Broad Industry") sector.broadIndustry = v;
      if (t === "Industry") sector.industry = v;
    });

    const annualReports = docBlock($, "Annual reports")
      .find("ul.list-links li a")
      .toArray()
      .map((a) => ({ year: clean($(a).text()).replace(/^Annual Report\s*/i, "").replace(/\s*from.*$/i, ""), url: $(a).attr("href")! }))
      .filter((r) => r.url);

    const concalls: Concall[] = docBlock($, "Concalls")
      .find("ul.list-links li")
      .toArray()
      .map((li) => {
        const c: Concall = { period: clean($(li).children("div").first().text()) };
        $(li)
          .find("a.button-chip")
          .each((_, a) => {
            const label = clean($(a).text()).toLowerCase();
            const href = $(a).attr("href");
            if (!href) return;
            if (label.startsWith("transcript")) c.transcript = href;
            else if (label === "ppt") c.ppt = href;
            else if (label === "rec") c.recording = href;
          });
        return c;
      })
      .filter((c) => c.period);

    const creditRatings = docBlock($, "Credit ratings")
      .find("ul.list-links li a")
      .toArray()
      .map((a) => {
        const when = clean($(a).find("div").text());
        return { title: clean($(a).clone().children().remove().end().text()), url: $(a).attr("href") ?? "", when };
      });

    const bseCode = html.match(/bseindia\.com\/stock-share-price\/[^"]*\/(\d{6})\//)?.[1] ?? null;

    return {
      symbol: symbol.toUpperCase(),
      screenerId,
      bseCode,
      name: clean($("h1").first().text()),
      consolidated,
      url,
      about: clean($(".company-profile .about").text()).replace(/\[\d+\]/g, ""),
      keyPoints: clean($(".company-profile .commentary").text()).replace(/\[\d+\]/g, ""),
      sector,
      topRatios,
      marketCapCr: parseNum(topRatios["Market Cap"]),
      price: parseNum(topRatios["Current Price"]),
      quarters: quarters.table,
      quarterPdfs: quarters.pdfs,
      annual: parseTable($, "profit-loss").table,
      balanceSheet: parseTable($, "balance-sheet").table,
      cashFlow: parseTable($, "cash-flow").table,
      ratios: parseTable($, "ratios").table,
      annualReports,
      concalls,
      creditRatings,
    };
  }
  throw new SourceError(`No financial data for ${symbol}`);
}

export async function getAnnouncements(
  screenerId: string,
  kind: "recent" | "important" = "recent",
): Promise<RawAnnouncement[]> {
  const html = await fetchText(`${BASE}/announcements/${kind}/${screenerId}/`, {
    headers: { Referer: `${BASE}/` },
  });
  const $ = cheerio.load(html);
  return $("ul.list-links li")
    .toArray()
    .map((li) => {
      const a = $(li).find("a").first();
      const meta = a.find("div").first();
      const ts = meta.find("time").attr("datetime") ?? "";
      const summary = clean(meta.text()).replace(/^[^-]*-\s*/, "");
      const title = clean(a.clone().children().remove().end().text());
      return { title, url: a.attr("href") ?? "", ts, summary };
    })
    .filter((x) => x.url && x.ts);
}

/** Recent + important, de-duplicated, newest first. */
export async function getAllAnnouncements(screenerId: string): Promise<RawAnnouncement[]> {
  const [recent, important] = await Promise.all([
    getAnnouncements(screenerId, "recent"),
    getAnnouncements(screenerId, "important").catch(() => []),
  ]);
  const seen = new Map<string, RawAnnouncement>();
  for (const a of [...recent, ...important]) if (!seen.has(a.url)) seen.set(a.url, a);
  return [...seen.values()].sort((a, b) => b.ts.localeCompare(a.ts));
}
