// Server-side assembly of the Push feed from the snapshot: grouping, titles, and the
// enrichment each card type deserves (numbers for results, people + network for changes).
import fs from "node:fs";
import path from "node:path";
import { resultsCut, resultsFromFiling, type FilingResults, type ResultsCut } from "./engine/fundamentals";
import { Network, sameName, type ExternalPerson, type Link, type NetworkData } from "./engine/network";
import type { Category, CompanyMeta, Filing, ScreenerCompany, Snapshot, Tier } from "./types";

const DATA = path.join(process.cwd(), "data");

// Read once at module scope: allowed during prerender, and cheap.
export const snapshot: Snapshot = JSON.parse(fs.readFileSync(path.join(DATA, "snapshot", "feed.json"), "utf8"));
export const networkData: NetworkData = JSON.parse(fs.readFileSync(path.join(DATA, "network.json"), "utf8"));
const enrichPath = path.join(DATA, "snapshot", "enrichments.json");
export const enrichments: Record<string, Enrichment> = fs.existsSync(enrichPath)
  ? JSON.parse(fs.readFileSync(enrichPath, "utf8"))
  : {};

export const network = new Network(networkData, new Date(snapshot.generatedAt));

/**
 * Zero-cost fallback when no LLM enrichment exists: pull names out of the standard SEBI
 * wording ("appointment of Mr. X (DIN: …)"). Careers aren't parsed, so only explicit
 * "knows" edges and exact-name matches can fire, but that's the strongest signal anyway.
 */
function regexPeople(id: string, title: string): PersonChange[] {
  const p = path.join(DATA, "snapshot", "texts", `${id}.txt`);
  const text = (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "").replace(/\s+/g, " ") + " " + title;
  const re =
    /\b(re-?appointment|appointment|resignation|cessation|retirement|relieving)\s+of\s+(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Shri|Smt\.?)\s+((?:[A-Z][a-zA-Z]*\.?\s?){1,4}?)(?=\s*(?:\(|,|as\b|from\b|w\.e\.f|\.|$))/g;
  const out = new Map<string, PersonChange>();
  for (const m of text.matchAll(re)) {
    const name = m[2].replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if (name.split(" ").length < 2 || out.has(name)) continue;
    const verb = m[1].toLowerCase();
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 180);
    const lastName = name.split(" ").at(-1)!;
    const raw = after.match(/\bas\s+(?:the\s+|an?\s+)?([A-Z][\w&\-,() ]{3,70}?)(?=\s+(?:of|on|for|with|w\.e\.f|effective|subject|in place)\b|[.;])/)?.[1];
    const role =
      canonicalRole(after) ??
      (title.includes(lastName) ? canonicalRole(title) : null) ??
      raw?.replace(/\s*\d.*$/, "").replace(/\([^)]*$/, "").trim() ??
      "Board / KMP";
    out.set(name, {
      name,
      role,
      action: verb.startsWith("re") && verb.includes("appoint") ? "reappointed" : verb === "appointment" ? "appointed" : verb === "retirement" ? "retired" : verb === "cessation" ? "ceased" : "resigned",
      roles: [],
      education: [],
    });
    if (out.size >= 3) break;
  }
  return [...out.values()];
}

function canonicalRole(s: string): string | null {
  if (/(chief executive officer|ceo)\s*\(?\s*designate/i.test(s)) return "CEO-designate";
  if (/interim\s+(md|ceo|chief executive|managing director)/i.test(s)) return "Interim MD & CEO";
  if (/managing director\s*(&|and)\s*(chief executive|ceo)|\bmd\s*(&|and)\s*ceo|ceo\s*(&|and)\s*(md|managing director)/i.test(s)) return "MD & CEO";
  if (/chief financial officer|\bcfo\b/i.test(s)) return "CFO";
  if (/chief executive officer|\bceo\b/i.test(s)) return "CEO";
  if (/chief compliance officer/i.test(s)) return "Chief Compliance Officer";
  if (/\bchair(man|person)\b/i.test(s)) return "Chairman";
  if (/whole[- ]?time director|executive director/i.test(s)) return "Whole-time Director";
  if (/independent director/i.test(s)) return "Independent Director";
  if (/nominee director/i.test(s)) return "Government Nominee Director";
  return null;
}

export function companyData(symbol: string): ScreenerCompany | null {
  const p = path.join(DATA, "snapshot", "companies", `${symbol}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
export const companyMeta = (symbol: string) => snapshot.companies.find((c) => c.symbol === symbol);

// ------------------------------------------------------------------ enrichment shapes (LLM output)

export type PersonChange = {
  name: string;
  role: string;
  action: "appointed" | "resigned" | "retired" | "reappointed" | "ceased" | "other";
  effective?: string | null;
  bio?: string | null;
  roles: { org: string; title: string; from: number | null; to: number | null }[];
  education: { school: string; degree?: string | null; year?: number | null }[];
};
export type Enrichment = {
  summary: string; // one line, plain English, why it matters
  people?: PersonChange[];
  materiality?: "high" | "medium" | "low";
  model?: string;
  results?: FilingResults;
};

// ------------------------------------------------------------------ feed items

export type LinkLite = {
  contactId: string;
  name: string;
  headline: string;
  kind: Link["kind"];
  reason: string;
  score: number;
  months: number;
  strength: 1 | 2 | 3;
};

export type FeedItem = {
  id: string;
  symbol: string;
  company: string;
  ts: string;
  cat: Category;
  tier: Tier;
  why: string;
  title: string;
  summary?: string;
  pdfUrl: string | null;
  related: { id: string; title: string; pdfUrl: string | null; ts: string }[];
  results?: ResultsCut;
  people?: (PersonChange & { links: LinkLite[] })[];
  who?: LinkLite[]; // best people to call about a material event
};

const GENERIC = /^announcement under regulation 30 ?\(lodr\)\s*-?\s*/i;

// "Intimation under Regulation 30 of SEBI (LODR) Regulations, 2015 - Capacity expansion at Dahej" → "Capacity expansion at Dahej"
const LODR_PREFIX = /^.*?(?:regulation\s*30|lodr|listing obligations)[^-–:]*?(?:regulations?,?\s*20\d\d\)?)?\s*(?:[-–:]|\bregarding\b|\bpertaining to\b|\bin respect of\b)\s+(?=\S.{8,})/i;
const USELESS = /^(announcement as attached|intimation attached\.?|disclosure attached\.?|general|press release \/ media release|updates?|intimation|disclosure|.{0,12})$/i;

/** Indian filing letters almost always carry a "Sub:" line with the real subject. */
function subjectLine(id: string): string | null {
  const p = path.join(DATA, "snapshot", "texts", `${id}.txt`);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  const text = raw.replace(/\s+/g, " ");
  // Press releases have no "Sub:" line; their headline is the first real sentence-like line.
  if (!/\bSub(?:ject)?\s*[:.\-–]/i.test(text)) {
    const line = raw
      .split("\n")
      .map((l) => l.trim())
      .find(
        (l) =>
          l.length >= 30 &&
          l.length <= 170 &&
          l.split(" ").length >= 5 &&
          !/limited|ltd\b|\bcin\b|regd|registered|e-?mail|website|tel\b|phone|www\.|@|\[page|\b\d{6}\b|press release|media release|for immediate|dalal street|bandra/i.test(l),
      );
    return line ?? null;
  }
  const m = text.match(/\bSub(?:ject)?\s*[:.\-–]\s*(.{12,220}?)(?=\s+(?:Dear|Ref\b|Ref\.|Sir|Madam|Pursuant|In terms|With reference|This is to|We wish|We hereby|Further to)|\s{2}|$)/i);
  if (!m) return null;
  return m[1].replace(LODR_PREFIX, "").replace(/^(intimation|disclosure|submission)\s+(of|under|regarding)\s+/i, "").trim();
}

function smartTitle(f: Filing): string {
  let t = f.subject.replace(GENERIC, "").trim();
  for (const cand of [t, f.headline]) {
    const stripped = cand.replace(LODR_PREFIX, "");
    if (stripped !== cand && stripped.length > 8) {
      t = stripped;
      break;
    }
  }
  const generic = !t || /^(general|change in directorate|change in management|acquisition|credit rating|scheme of arrangement|joint venture|updates on acquisition|award_of_order_receipt_of_order|analyst \/ investor meet - intimation|newspaper publication|cessation|resignation of director|disclosure under regulation 30.*|intimation under regulation 30.*)$/i.test(t);
  if (generic && f.headline && f.headline.length > 12) {
    t = f.headline;
    // Keep BSE's specific label when the headline is vague ("Joint Venture: Outcome of the Board Meeting…").
    const sub = f.bseSub.replace(/_/g, " ");
    if (sub && !/^(general|none|others?)$/i.test(sub) && !t.toLowerCase().includes(sub.toLowerCase().slice(0, 8)) && /outcome|intimation|disclosure|update/i.test(t))
      t = `${sub}: ${t}`;
  }
  // BSE's feed loses the rupee sign ("face value ?10/-") and doubles quotes (''CPDPL'').
  t = t.replace(/_/g, " ").replace(/\?\s?(?=\d)/g, "₹").replace(/''/g, '"').replace(/\s+/g, " ").trim();
  if (USELESS.test(t)) {
    const s = subjectLine(f.id);
    if (s && s.length > 10) t = s;
  }
  // Sentence-case shouty Title Case From BSE ("Appointment Of Shri X As Director")
  if (/^([A-Z][a-z'’]*\s?){5,}/.test(t)) t = t.replace(/\b(Of|The|And|As|To|For|In|On|With|By|At|From|Under|An|A)\b/g, (w) => w.toLowerCase());
  return t.length > 160 ? t.slice(0, 157) + "…" : t;
}

const toLite = (l: Link): LinkLite => ({
  contactId: l.contact.id,
  name: l.contact.name,
  headline: l.contact.headline,
  kind: l.kind,
  reason: l.reason,
  score: +l.score.toFixed(2),
  months: network.monthsSince(l.contact.tie.lastContact),
  strength: l.contact.tie.strength,
});

const GROUPABLE: Category[] = ["results", "earnings_call", "M&A", "management_change", "credit_rating", "investor_meetings"];
const TIER_RANK: Record<Tier, number> = { act: 0, know: 1, routine: 2 };

export function buildFeed(): FeedItem[] {
  const companies = new Map<string, CompanyMeta>(snapshot.companies.map((c) => [c.symbol, c]));
  const filings = [...snapshot.filings].sort((a, b) => a.ts.localeCompare(b.ts));
  const items: FeedItem[] = [];
  const open = new Map<string, FeedItem>(); // symbol|cat → item still accepting related filings

  for (const f of filings) {
    const co = companies.get(f.symbol);
    if (!co?.inPortfolio) continue;
    const key = `${f.symbol}|${f.cat}`;
    const prev = open.get(key);
    const within72h = prev && new Date(f.ts).getTime() - new Date(prev.ts).getTime() < 72 * 3600e3;
    if (prev && within72h && GROUPABLE.includes(f.cat) && f.cat !== "management_change") {
      // Fold into the existing card. The newest filing becomes the face of the card (the story
      // moved on), except on results days, where the results filing itself stays primary.
      const isResultsDoc = f.cat === "results" && /financial results/i.test(f.bseSub + f.subject);
      const prevIsResultsDoc = prev.cat === "results" && /financial results/i.test(prev.title);
      const promote = TIER_RANK[f.tier] <= TIER_RANK[prev.tier] && (f.cat !== "results" || isResultsDoc || !prevIsResultsDoc);
      if (promote) {
        prev.related.push({ id: prev.id, title: prev.title, pdfUrl: prev.pdfUrl, ts: prev.ts });
        Object.assign(prev, { id: f.id, title: smartTitle(f), pdfUrl: f.pdfUrl, why: f.why });
      } else {
        prev.related.push({ id: f.id, title: smartTitle(f), pdfUrl: f.pdfUrl, ts: f.ts });
      }
      if (TIER_RANK[f.tier] < TIER_RANK[prev.tier]) prev.tier = f.tier;
      prev.ts = f.ts > prev.ts ? f.ts : prev.ts; // card time = latest activity
      continue;
    }
    const item: FeedItem = {
      id: f.id,
      symbol: f.symbol,
      company: shortName(co.name),
      ts: f.ts,
      cat: f.cat,
      tier: f.tier,
      why: f.why,
      title: smartTitle(f),
      pdfUrl: f.pdfUrl,
      related: [],
    };
    items.push(item);
    open.set(key, item);
  }

  const resultsShown = new Set<string>();
  for (const it of items) {
    const co = companies.get(it.symbol)!;
    const e = enrichments[it.id];
    if (e?.summary) it.summary = e.summary;
    if (e?.materiality === "low" && it.tier === "act" && it.cat !== "management_change") it.tier = "know";

    // One results grid per company: items run oldest-first here, so the results filing itself gets it,
    // not a later press release or call notice about the same numbers.
    if (it.cat === "results" && it.tier === "act" && !resultsShown.has(it.symbol)) {
      resultsShown.add(it.symbol);
      const data = companyData(it.symbol);
      const cut = data && resultsCut(data, co.isLender);
      // Standardised table first, but only if it already contains the quarter this filing announced.
      const fresh = cut && withinDays(it.ts, quarterEnd(cut.period), 75) ? cut : null;
      const fromFiling = e?.results ? resultsFromFiling(e.results, co.isLender) : null;
      if (fresh) {
        if (fromFiling) {
          const a = fresh.metrics.find((m) => m.key === "pat")?.cur;
          const b = fromFiling.metrics.find((m) => m.key === "pat")?.cur;
          fresh.verified = a != null && b != null && Math.abs(a - b) <= Math.max(1, Math.abs(a) * 0.02);
        }
        it.results = fresh;
      } else if (fromFiling) {
        it.results = fromFiling; // screener hasn't caught up: read straight from the filing
      }
    }
    const people = e?.people?.length ? e.people : it.cat === "management_change" && it.tier !== "routine" ? regexPeople(it.id, it.title) : [];
    if (it.cat === "management_change" && people.length) {
      it.people = people.map((p) => {
        const ext: ExternalPerson = {
          name: p.name,
          roles: p.roles.filter((r) => r.from != null).map((r) => ({ org: r.org, title: r.title, from: r.from!, to: r.to })),
          education: p.education.filter((x) => x.year != null).map((x) => ({ school: x.school, degree: x.degree ?? undefined, to: x.year! })),
        };
        return { ...p, links: network.linksToPerson(ext).slice(0, 3).map(toLite) };
      });
      // A human title beats BSE's "Disclosure under Regulation 30…".
      const verb: Record<PersonChange["action"], string> = {
        appointed: "appointed",
        reappointed: "re-appointed",
        resigned: "resigns as",
        retired: "retires as",
        ceased: "ceases to be",
        other: "·",
      };
      it.title = it.people
        .slice(0, 2)
        .map((p) => `${p.name} ${verb[p.action]} ${p.role}`)
        .join("; ");
      // A change at the top always needs the investor, whatever BSE's title says.
      if (it.people.some((p) => /\b(CEO|CFO|MD|Chairman)\b/.test(p.role))) {
        it.tier = "act";
        it.why = "Change at the top";
      }
    }
    if (["M&A", "capex", "litigation", "fund_raise", "management_change", "results"].includes(it.cat) && it.tier === "act") {
      it.who = network.linksToCompany(it.symbol, co.sector).slice(0, 3).map(toLite);
    }
  }

  // The same appointment often arrives twice (board approval, then the regulator's): one card per
  // story. Same company, same person, within 30 days → fold the older card into the newer one.
  const out: FeedItem[] = [];
  for (const it of items.sort((a, b) => b.ts.localeCompare(a.ts))) {
    const keep =
      it.cat === "management_change" && it.people?.length
        ? out.find(
            (k) =>
              k.cat === "management_change" &&
              k.symbol === it.symbol &&
              new Date(k.ts).getTime() - new Date(it.ts).getTime() < 30 * 864e5 &&
              k.people?.some((p) => it.people!.some((q) => sameName(p.name, q.name))),
          )
        : undefined;
    if (!keep) {
      out.push(it);
      continue;
    }
    keep.related.push({ id: it.id, title: it.title, pdfUrl: it.pdfUrl, ts: it.ts }, ...it.related);
    if (TIER_RANK[it.tier] < TIER_RANK[keep.tier]) keep.tier = it.tier;
    keep.summary ??= it.summary;
  }
  return out;
}

export function shortName(n: string) {
  return n.replace(/\b(Limited|Ltd\.?)$/i, "").replace(/\s+/g, " ").trim();
}

function quarterEnd(label: string) {
  // "Sep 2026" → 2026-09-30
  const d = new Date(`1 ${label}`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
}
function withinDays(ts: string, ref: string, days: number) {
  const diff = (new Date(ts).getTime() - new Date(ref).getTime()) / 864e5;
  return diff >= 0 && diff <= days;
}
