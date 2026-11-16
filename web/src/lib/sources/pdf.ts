// PDF → text for filings, transcripts and annual reports. Pure JS (pdf.js via unpdf), so it
// runs both in local scripts and inside a serverless function.
import https from "node:https";
import { getDocumentProxy } from "unpdf";
import { fetchWithRetry, UA } from "./http";

const PDF_HEADERS = { Referer: "https://www.bseindia.com/", Accept: "application/pdf,*/*" };

export async function fetchPdf(url: string): Promise<Uint8Array> {
  let buf: Uint8Array;
  try {
    const res = await fetchWithRetry(url, { headers: PDF_HEADERS, timeoutMs: 60_000, retries: 1 });
    buf = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    // Some BSE responses carry a malformed header that fetch's strict parser rejects
    // ("Unexpected whitespace after header value"). Node's https accepts it in lenient mode.
    if (!/HTTPParserError|Unexpected whitespace/i.test(String((e as { cause?: unknown }).cause ?? ""))) throw e;
    buf = await lenientGet(url);
  }
  if (buf.length < 5 || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") {
    throw new Error(`Not a PDF: ${url}`);
  }
  return buf;
}

function lenientGet(url: string, redirects = 3): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": UA, ...PDF_HEADERS }, insecureHTTPParser: true, timeout: 60_000 }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        lenientGet(new URL(res.headers.location, url).toString(), redirects - 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        res.resume();
        reject(new Error(`${status} from ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error(`timeout fetching ${url}`)));
    req.on("error", reject);
  });
}

/** Text of each page (1-based range, inclusive). Caps work on huge annual reports. */
export async function pdfPages(
  data: Uint8Array,
  opts: { from?: number; to?: number; maxPages?: number } = {},
): Promise<{ totalPages: number; pages: string[] }> {
  const pdf = await getDocumentProxy(data, { maxImageSize: 16_777_216, verbosity: 0 });
  const total = pdf.numPages;
  const from = Math.max(1, opts.from ?? 1);
  const to = Math.min(total, opts.to ?? total, from + (opts.maxPages ?? 400) - 1);
  const pages: string[] = [];
  for (let i = from; i <= to; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const out: string[] = [];
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      if (typeof item.str !== "string") continue;
      line += item.str;
      if (item.hasEOL) {
        out.push(line);
        line = "";
      } else line += "";
    }
    if (line) out.push(line);
    pages.push(out.join("\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim());
  }
  try {
    await pdf.cleanup();
  } catch {
    /* best-effort */
  }
  return { totalPages: total, pages };
}

export async function pdfTextFromUrl(url: string, opts: { maxPages?: number; maxChars?: number } = {}) {
  const data = await fetchPdf(url);
  const { totalPages, pages } = await pdfPages(data, { maxPages: opts.maxPages ?? 30 });
  const text = pages.map((p, i) => `[page ${i + 1}]\n${p}`).join("\n\n");
  return { totalPages, text: text.slice(0, opts.maxChars ?? 60_000) };
}
