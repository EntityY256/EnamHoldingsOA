// BSE corporate announcements: the primary filings feed, with BSE's own category labels.
import { fetchWithRetry } from "./http";

export type BseFiling = {
  id: string;
  bseCode: string;
  ts: string; // ISO, IST offset
  category: string; // e.g. "Company Update", "Result", "Board Meeting"
  subcategory: string; // e.g. "Analyst / Investor Meet", "Change in Directorate"
  subject: string; // NEWSSUB, the filing's title
  headline: string; // HEADLINE, the company's own short description (often more specific)
  pdfUrl: string | null;
  critical: boolean;
};

type Row = {
  NEWSID: string;
  SCRIP_CD: number;
  NEWSSUB: string | null;
  NEWS_DT: string;
  CATEGORYNAME: string | null;
  SUBCATNAME: string | null;
  HEADLINE: string | null;
  ATTACHMENTNAME: string | null;
  CRITICALNEWS: number | null;
};

const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

export function bsePdfUrl(attachment: string) {
  return `https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=${attachment}`;
}

export async function getBseFilings(bseCode: string, from: Date, to: Date = new Date()): Promise<BseFiling[]> {
  const rows: Row[] = [];
  for (let page = 1; page <= 8; page++) {
    const url =
      `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?pageno=${page}&strCat=-1` +
      `&strPrevDate=${ymd(from)}&strScrip=${bseCode}&strSearch=P&strToDate=${ymd(to)}&strType=C&subcategory=-1`;
    const res = await fetchWithRetry(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.bseindia.com/",
        Origin: "https://www.bseindia.com",
      },
    });
    const j = (await res.json()) as { Table?: Row[]; Table1?: { ROWCNT: number }[] };
    const batch = j.Table ?? [];
    rows.push(...batch);
    const total = j.Table1?.[0]?.ROWCNT ?? 0;
    if (!batch.length || rows.length >= total) break;
  }
  return rows.map((r) => ({
    id: r.NEWSID,
    bseCode: String(r.SCRIP_CD),
    ts: r.NEWS_DT.replace(/\.\d+$/, "") + "+05:30",
    category: (r.CATEGORYNAME ?? "").trim(),
    subcategory: (r.SUBCATNAME ?? "").trim(),
    subject: (r.NEWSSUB ?? "").trim(),
    headline: (r.HEADLINE ?? "").trim(),
    pdfUrl: r.ATTACHMENTNAME ? bsePdfUrl(r.ATTACHMENTNAME) : null,
    critical: r.CRITICALNEWS === 1,
  }));
}
