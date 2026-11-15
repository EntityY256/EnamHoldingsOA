// Server-side assembly of the Push feed from the snapshot: grouping, titles, and the
// enrichment each card type deserves (numbers for results, people + network for changes).
import fs from "node:fs";
import path from "node:path";
import { resultsCut, resultsFromFiling, type FilingResults, type ResultsCut } from "./engine/fundamentals";
import { Network, type ExternalPerson, type Link, type NetworkData } from "./engine/network";
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

function smartTitle(f: Filing): string {
  let t = f.subject.replace(GENERIC, "").trim();
  const generic = !t || /^(general|change in directorate|change in management|acquisition|credit rating|scheme of arrangement|joint venture|updates on acquisition|award_of_order_receipt_of_order|analyst \/ investor meet - intimation|newspaper publication|cessation|resignation of director|disclosure under regulation 30.*|intimation under regulation 30.*)$/i.test(t);
  if (generic && f.headline && f.headline.length > 12) t = f.headline;
  t = t.replace(/_/g, " ").replace(/\s+/g, " ").trim();
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
      // Fold into the existing card; promote if this filing is more important.
      prev.related.push({ id: f.id, title: smartTitle(f), pdfUrl: f.pdfUrl, ts: f.ts });
      if (TIER_RANK[f.tier] < TIER_RANK[prev.tier] || (f.cat === "results" && /financial results/i.test(f.bseSub + f.subject))) {
        prev.related.push({ id: prev.id, title: prev.title, pdfUrl: prev.pdfUrl, ts: prev.ts });
        prev.related = prev.related.filter((r) => r.id !== f.id);
        Object.assign(prev, { id: f.id, ts: f.ts, title: smartTitle(f), pdfUrl: f.pdfUrl, tier: TIER_RANK[f.tier] < TIER_RANK[prev.tier] ? f.tier : prev.tier, why: f.why });
      }
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

  for (const it of items) {
    const co = companies.get(it.symbol)!;
    const e = enrichments[it.id];
    if (e?.summary) it.summary = e.summary;
    if (e?.materiality === "low" && it.tier === "act" && it.cat !== "management_change") it.tier = "know";

    if (it.cat === "results" && it.tier === "act") {
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
    }
    if (["M&A", "capex", "litigation", "fund_raise", "management_change", "results"].includes(it.cat) && it.tier === "act") {
      it.who = network.linksToCompany(it.symbol, co.sector).slice(0, 3).map(toLite);
    }
  }
  return items.sort((a, b) => b.ts.localeCompare(a.ts));
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
