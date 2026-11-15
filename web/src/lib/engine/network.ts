// The Network layer: turns the investor's contacts into "who can help me understand this".
// Pure, deterministic graph logic over the investor's private data — no model ever sees it.
// Every suggestion carries a human-readable reason and a strength, so it can be trusted.

export type Stint = { org: string; title: string; from: number; to: number | null; fn?: string };
export type Edu = { school: string; degree?: string; from?: number; to: number };
export type Tie = { strength: 1 | 2 | 3; how: string; lastContact: string };
export type Known = { name: string; context: string; strength: 1 | 2 | 3 };

export type Contact = {
  id: string;
  name: string;
  headline: string;
  city: string;
  roles: Stint[];
  education: Edu[];
  expertise: string[];
  tie: Tie;
  knows?: Known[];
  notes?: string;
};

export type Org = { key: string; name: string; aliases?: string[]; symbol?: string; tags: string[] };

export type NetworkData = {
  synthetic: true;
  investor: { name: string; roles: Stint[]; education: Edu[] };
  orgs: Org[];
  contacts: Contact[];
};

/** A person who appears in a filing (e.g. an incoming CFO), as extracted from the document. */
export type ExternalPerson = { name: string; roles: Stint[]; education: Edu[] };

export type Link = {
  contact: Contact;
  kind: "you" | "knows" | "colleague" | "classmate" | "alumni-of-employer" | "insider" | "former-insider" | "peer" | "expert";
  reason: string;
  score: number; // 0..10, higher = better path
};

const STOP = /\b(limited|ltd|pvt|private|the|inc|llp|plc|corporation|corp|company|co|group|india)\b\.?/g;

export function normOrg(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,()'’]/g, " ")
    .replace(STOP, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normName(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|shri|smt|prof|ca|cs)\b\.?/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Names match if all tokens of the shorter name appear in the longer one (handles middle names). */
export function sameName(a: string, b: string) {
  const ta = normName(a).split(" ").filter((t) => t.length > 1);
  const tb = normName(b).split(" ").filter((t) => t.length > 1);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.length >= 2 && short.every((t) => long.includes(t));
}

export class Network {
  private orgIndex = new Map<string, Org>();
  constructor(
    public data: NetworkData,
    private today = new Date("2026-11-16T09:00:00+05:30"),
  ) {
    for (const o of data.orgs) {
      for (const n of [o.name, ...(o.aliases ?? [])]) this.orgIndex.set(normOrg(n), o);
      if (o.symbol) this.orgIndex.set(o.symbol.toLowerCase(), o);
    }
  }

  org(name: string): Org | undefined {
    const n = normOrg(name);
    return this.orgIndex.get(n) ?? [...this.orgIndex.entries()].find(([k]) => k.length > 3 && (n.startsWith(k + " ") || n === k))?.[1];
  }
  orgKey(name: string) {
    return this.org(name)?.key ?? normOrg(name);
  }
  orgBySymbol(symbol: string) {
    return this.data.orgs.find((o) => o.symbol === symbol);
  }

  monthsSince(iso: string) {
    return Math.max(0, Math.round((this.today.getTime() - new Date(iso).getTime()) / (30.44 * 864e5)));
  }

  /** Strength of the investor's own tie, decayed by how long since they last spoke. */
  private tieScore(c: Contact) {
    const m = this.monthsSince(c.tie.lastContact);
    const decay = m <= 3 ? 1 : m <= 12 ? 0.85 : m <= 24 ? 0.7 : 0.55;
    return c.tie.strength * decay; // 0.55 .. 3
  }

  // ------------------------------------------------------------ people (management changes)

  linksToPerson(target: ExternalPerson): Link[] {
    const out: Link[] = [];
    for (const c of this.data.contacts) {
      const tie = this.tieScore(c);
      if (sameName(c.name, target.name)) {
        out.push({ contact: c, kind: "you", reason: `${c.name} is already in your network (${c.tie.how}).`, score: 10 });
        continue;
      }
      const k = c.knows?.find((x) => sameName(x.name, target.name));
      if (k) {
        out.push({ contact: c, kind: "knows", reason: `Knows ${target.name} directly: ${k.context}.`, score: 3 + tie + k.strength });
        continue;
      }
      let best: Link | null = null;
      for (const r of c.roles)
        for (const t of target.roles) {
          if (this.orgKey(r.org) !== this.orgKey(t.org)) continue;
          const lo = Math.max(r.from, t.from);
          const hi = Math.min(r.to ?? this.today.getFullYear(), t.to ?? this.today.getFullYear());
          const orgName = this.org(r.org)?.name ?? r.org;
          if (hi - lo >= 1) {
            const s = 2 + tie + Math.min(hi - lo, 5) * 0.4;
            if (!best || s > best.score)
              best = {
                contact: c,
                kind: "colleague",
                reason: `Overlapped with ${firstName(target.name)} at ${orgName} for ~${hi - lo} yr${hi - lo > 1 ? "s" : ""} (${lo}–${hi}); ${c.name.split(" ")[0]} was ${r.title}.`,
                score: s,
              };
          } else if (!best) {
            best = {
              contact: c,
              kind: "alumni-of-employer",
              reason: `Also worked at ${orgName} (${r.from}–${r.to ?? "now"}), so can speak to the culture ${firstName(target.name)} comes from.`,
              score: 0.5 + tie * 0.5,
            };
          }
        }
      for (const e of c.education)
        for (const te of target.education) {
          if (normOrg(e.school) !== normOrg(te.school) && this.orgKey(e.school) !== this.orgKey(te.school)) continue;
          const gap = Math.abs(e.to - te.to);
          if (gap <= 2) {
            const s = 1.5 + tie + (gap === 0 ? 1 : 0.4);
            if (!best || s > best.score)
              best = {
                contact: c,
                kind: "classmate",
                reason:
                  gap === 0
                    ? `Same batch as ${firstName(target.name)} at ${e.school} ('${String(e.to).slice(2)}).`
                    : `At ${e.school} at the same time as ${firstName(target.name)} (class of '${String(e.to).slice(2)} vs '${String(te.to).slice(2)}).`,
                score: s,
              };
          }
        }
      if (best) out.push(best);
    }
    return out.sort((a, b) => b.score - a.score);
  }

  // ------------------------------------------------------------ companies (events, research)

  /** Who can give context on a company: insiders, ex-insiders, peers, and sector experts. */
  linksToCompany(symbol: string, sector: { broadIndustry?: string; industry?: string; sector?: string }, themes: string[] = []): Link[] {
    const target = this.orgBySymbol(symbol);
    // Exchange sector labels plus our own theme tags (e.g. "semiconductors", "rural lending").
    const sectorTags = [...new Set([sector.industry, sector.broadIndustry, ...themes, ...(target?.tags ?? [])]
      .filter(Boolean)
      .map((s) => s!.toLowerCase()))];
    const out: Link[] = [];
    for (const c of this.data.contacts) {
      const tie = this.tieScore(c);
      let best: Link | null = null;
      for (const r of c.roles) {
        const o = this.org(r.org);
        if (target && o?.key === target.key) {
          const current = r.to == null;
          const yearsAgo = current ? 0 : this.today.getFullYear() - r.to!;
          // Having worked there beats a closer friend at a peer; recency matters.
          const s = (current ? 6 : 5 - Math.min(yearsAgo, 10) * 0.2) + tie * 0.8;
          const l: Link = {
            contact: c,
            kind: current ? "insider" : "former-insider",
            reason: current
              ? `Works at ${o.name} now as ${r.title}. Mind what you ask an insider.`
              : `Was ${r.title} at ${o.name} (${r.from}–${r.to}). Knows how the place works from the inside${yearsAgo <= 3 ? ", and recently" : ""}.`,
            score: s,
          };
          if (!best || l.score > best.score) best = l;
        } else if (o && o.key !== target?.key && sectorTags.some((t) => o.tags.some((ot) => ot.toLowerCase() === t))) {
          const s = 1.5 + tie * 0.8 + (r.to == null ? 0.5 : 0);
          const l: Link = {
            contact: c,
            kind: "peer",
            reason: `${r.to == null ? "Is" : "Was"} ${r.title} at ${o.name}, a ${o.tags[0]} peer. Can benchmark ${target?.name ?? symbol} against competitors.`,
            score: s,
          };
          if (!best || l.score > best.score) best = l;
        }
      }
      if (!best) {
        const hit = c.expertise.find((e) => sectorTags.some((t) => t.includes(e.toLowerCase()) || e.toLowerCase().includes(t)));
        if (hit) best = { contact: c, kind: "expert", reason: `Your go-to on ${hit}.`, score: 1 + tie * 0.8 };
      }
      if (best) out.push(best);
    }
    return out.sort((a, b) => b.score - a.score);
  }

  // ------------------------------------------------------------ direct queries

  expertiseMap(): { theme: string; contacts: Contact[] }[] {
    const m = new Map<string, Contact[]>();
    for (const c of this.data.contacts) for (const e of c.expertise) m.set(e, [...(m.get(e) ?? []), c]);
    return [...m.entries()]
      .map(([theme, contacts]) => ({ theme, contacts: contacts.sort((a, b) => this.tieScore(b) - this.tieScore(a)) }))
      .sort((a, b) => b.contacts.length - a.contacts.length || a.theme.localeCompare(b.theme));
  }

  /** Contacts gone quiet whose (former) employer just did something: a natural reason to call. */
  keepWarm(events: { symbol: string; label: string; ts: string }[], minMonths = 6) {
    const out: { contact: Contact; months: number; event: { symbol: string; label: string; ts: string }; connection: string }[] = [];
    for (const c of this.data.contacts) {
      const months = this.monthsSince(c.tie.lastContact);
      if (months < minMonths) continue;
      for (const r of c.roles) {
        const o = this.org(r.org);
        const ev = o?.symbol && events.find((e) => e.symbol === o.symbol);
        if (ev) {
          out.push({ contact: c, months, event: ev, connection: `${r.to == null ? "works" : "used to work"} at ${o!.name}` });
          break;
        }
      }
    }
    return out.sort((a, b) => b.months - a.months);
  }

  search(q: string): Link[] {
    const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    const out: Link[] = [];
    for (const c of this.data.contacts) {
      const hay = [c.name, c.headline, c.city, ...c.expertise, ...c.roles.map((r) => `${r.org} ${this.org(r.org)?.name ?? ""} ${r.title} ${(this.org(r.org)?.tags ?? []).join(" ")}`), ...c.education.map((e) => e.school), c.notes ?? ""]
        .join(" ")
        .toLowerCase();
      const hits = terms.filter((t) => hay.includes(t)).length;
      if (hits) out.push({ contact: c, kind: "expert", reason: c.headline, score: hits + this.tieScore(c) / 3 });
    }
    return out.sort((a, b) => b.score - a.score);
  }
}

function firstName(n: string) {
  return n.replace(/^(mr|mrs|ms|dr|shri|smt)\.?\s+/i, "").split(" ")[0];
}
