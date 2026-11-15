// PDF → text for filings, transcripts and annual reports. Pure JS (pdf.js via unpdf), so it
// runs both in local scripts and inside a serverless function.
import { getDocumentProxy } from "unpdf";
import { fetchWithRetry } from "./http";

export async function fetchPdf(url: string): Promise<Uint8Array> {
  const res = await fetchWithRetry(url, {
    headers: { Referer: "https://www.bseindia.com/", Accept: "application/pdf,*/*" },
    timeoutMs: 60_000,
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 5 || String.fromCharCode(...buf.slice(0, 4)) !== "%PDF") {
    throw new Error(`Not a PDF: ${url}`);
  }
  return buf;
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
