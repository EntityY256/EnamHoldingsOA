// Shared fetch helper for public data sources (screener.in, BSE, NSE archives, Yahoo).
// These sites reject requests without a browser-like User-Agent.
export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export class SourceError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit & { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { retries = 2, timeoutMs = 25_000, headers, ...rest } = init;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new SourceError(`${res.status} from ${url}`, res.status);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new SourceError(`${res.status} from ${url}`, res.status);
      return res;
    } catch (e) {
      lastErr = e;
      if (e instanceof SourceError && e.status && e.status < 500 && e.status !== 429) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new SourceError(String(lastErr));
}

export async function fetchText(url: string, init?: Parameters<typeof fetchWithRetry>[1]) {
  return (await fetchWithRetry(url, init)).text();
}

/** "1,234" → 1234, "27%" → 27, "-2,273" → -2273, "" → null */
export function parseNum(s: string | undefined | null): number | null {
  if (!s) return null;
  const clean = s.replace(/[,%₹\s]|Rs\.?|Cr\.?/g, "").replace(/^\+/, "");
  if (clean === "" || clean === "-") return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}
