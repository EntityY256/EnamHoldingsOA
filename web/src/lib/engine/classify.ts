// Rule-based filing classifier. BSE already labels every filing with a category and
// subcategory; we map those onto the reference taxonomy and fall back to keywords on the
// company's own headline for the large "General" bucket. Deterministic, free, auditable —
// an LLM is only needed for the long tail (and for summarising, not sorting).
import type { BseFiling } from "../sources/bse";

export const CATEGORIES = [
  "results",
  "M&A",
  "fund_raise",
  "management_change",
  "litigation",
  "insider_trading",
  "earnings_call",
  "investor_meetings",
  "credit_rating",
  "dividend",
  "bonus_split",
  "capex",
  "press_release",
  "postal_ballot",
  "agm_egm",
  "pledging",
  "unclassified",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** act = needs the investor's attention; know = worth a line; routine = collapsed. */
export type Tier = "act" | "know" | "routine";

export const CATEGORY_LABEL: Record<Category, string> = {
  results: "Results",
  "M&A": "M&A",
  fund_raise: "Fund raise",
  management_change: "Management",
  litigation: "Litigation",
  insider_trading: "Insider trade",
  earnings_call: "Earnings call",
  investor_meetings: "Investor meet",
  credit_rating: "Credit rating",
  dividend: "Dividend",
  bonus_split: "Bonus / split",
  capex: "Capex",
  press_release: "News",
  postal_ballot: "Postal ballot",
  agm_egm: "AGM / EGM",
  pledging: "Pledge",
  unclassified: "Routine",
};

const SENIOR =
  /\b(chief executive|ceo|chief financial|cfo|managing director|m\.?d\.?\b|chairman|chairperson|whole[- ]?time director|executive director|chief operating|coo|chief risk|chief business|deputy managing|president)\b/i;

type Rule = { cat: Category; sub?: RegExp; text?: RegExp };

// Order matters: the first matching rule wins.
const RULES: Rule[] = [
  // Routine paperwork first, so keyword rules below don't promote it.
  { cat: "unclassified", sub: /newspaper|74 ?\(5\)|esop|esps|statutory auditor|half yearly report|asset cover|closure of trading window|amendments to memorandum|meeting updates|board meeting rescheduled/i },
  { cat: "unclassified", text: /esg rating|trading window|loss of share certificate|duplicate share|regulation 74|compliance certificate|secretarial|brsr|business responsibility/i },
  // SEBI takeover-code / insider disclosures mention "acquisition" but are shareholding reports, not deals.
  { cat: "pledging", sub: /31 ?\(1\)|31 ?\(2\)/i },
  { cat: "insider_trading", sub: /29 ?\(2\)|insider|7 ?\(2\)/i },
  { cat: "insider_trading", text: /\bsast\b|substantial acquisition of shares|regulation 29|regulation 7 ?\(2\)|prohibition of insider trading/i },
  { cat: "results", sub: /financial results/i },
  { cat: "results", text: /financial results|integrated filing \(financial\)/i },
  { cat: "earnings_call", sub: /earnings call/i },
  { cat: "earnings_call", text: /transcript|audio recording|conference call|earnings call|con-?call|webcast/i },
  { cat: "investor_meetings", sub: /analyst \/ investor meet/i },
  { cat: "results", sub: /investor presentation/i },
  { cat: "management_change", sub: /change in (management|directorate)|resignation|retirement|cessation|appointment of company secretary|demise/i },
  { cat: "management_change", text: /\b(appoint|re-?appoint|resign|cessation|retire|demise)\w*|managing director|chief executive|chief financial|\bceo\b|\bcfo\b/i },
  { cat: "M&A", sub: /acquisition|scheme of arrangement|joint venture|disinvestment|restructuring|amalgamation/i },
  { cat: "M&A", text: /acqui|amalgamat|merger|demerger|scheme of arrangement|joint venture|share purchase agreement|stake/i },
  { cat: "litigation", sub: /insolvency|cirp/i },
  { cat: "litigation", text: /litigation|penalt|show cause|demand notice|tax demand|\bgst\b|income tax|nclt|tribunal|\bcourt\b|arbitration|regulatory action|fine imposed|insolvency|search and seizure/i },
  { cat: "fund_raise", sub: /qualified institutional|preferential issue|issue of securities|buy ?back|allotment of equity|rights issue|commercial paper|monitoring agency|deviation/i },
  { cat: "fund_raise", text: /\bqip\b|preferential|rights issue|buy-?back|non-convertible|debentures|commercial paper|fund rais/i },
  { cat: "pledging", sub: /31 ?\(1\)|31 ?\(2\)/i },
  { cat: "pledging", text: /pledge|encumbrance/i },
  { cat: "insider_trading", sub: /29 ?\(2\)|insider|7 ?\(2\)/i },
  { cat: "credit_rating", sub: /credit rating/i },
  { cat: "credit_rating", text: /credit rating/i },
  { cat: "dividend", sub: /dividend|record date/i },
  { cat: "dividend", text: /dividend/i },
  { cat: "bonus_split", text: /bonus issue|bonus shares|stock split|sub-?division/i },
  { cat: "capex", text: /capacity|commissioning|commercial operation|expansion|greenfield|brownfield|new plant|capex|commercial production|manufacturing facility/i },
  { cat: "postal_ballot", text: /postal ballot/i },
  { cat: "agm_egm", sub: /agm|egm/i },
  { cat: "agm_egm", text: /annual general meeting|extraordinary general meeting|\bagm\b|\begm\b/i },
  { cat: "press_release", sub: /press release|media release|award of order|clarification|memorandum of understanding|monthly business/i },
  { cat: "press_release", text: /order|contract|launch|partnership|press release|clarification|agreement/i },
];

export type Classified = { cat: Category; tier: Tier; senior?: boolean; why: string };

export function classify(f: Pick<BseFiling, "category" | "subcategory" | "subject" | "headline">): Classified {
  const sub = `${f.category}/${f.subcategory}`;
  const text = `${f.subject} ${f.headline}`;
  let cat: Category = "unclassified";
  for (const r of RULES) {
    if ((r.sub && r.sub.test(sub)) || (r.text && r.text.test(text))) {
      cat = r.cat;
      break;
    }
  }
  // Board meeting notices are scheduling paperwork, even when the agenda is results.
  if (/board meeting/i.test(f.category) && /intimation/i.test(text) && cat === "results") {
    return { cat, tier: "routine", why: "Notice of a future board meeting" };
  }
  return { cat, ...tierFor(cat, text, sub) };
}

function tierFor(cat: Category, text: string, sub: string): Omit<Classified, "cat"> {
  switch (cat) {
    case "results":
      return /investor presentation/i.test(sub)
        ? { tier: "know", why: "Results deck" }
        : { tier: "act", why: "Quarterly numbers" };
    case "management_change": {
      if (/company secretary|compliance officer/i.test(text + sub)) return { tier: "routine", why: "Compliance role" };
      const senior = SENIOR.test(text);
      return senior
        ? { tier: "act", senior, why: "Change at the top" }
        : { tier: "know", senior, why: "Board change" };
    }
    case "M&A":
      return { tier: "act", why: "Deal activity" };
    case "litigation":
      return { tier: "act", why: "Legal / regulatory exposure" };
    case "capex":
      return { tier: "act", why: "Capacity or capex" };
    case "pledging":
      return { tier: "act", why: "Promoter pledge" };
    case "fund_raise":
      return /commercial paper|monitoring agency|deviation|allotment of equity/i.test(text + sub)
        ? { tier: "routine", why: "Debt / issue paperwork" }
        : { tier: "act", why: "Equity raise or buyback" };
    case "credit_rating":
      return /downgrad|negative|watch/i.test(text)
        ? { tier: "act", why: "Rating pressure" }
        : { tier: "know", why: "Rating action" };
    case "earnings_call":
      return /transcript/i.test(text + sub)
        ? { tier: "know", why: "Transcript is out" }
        : { tier: "routine", why: "Call logistics" };
    case "insider_trading":
    case "dividend":
    case "bonus_split":
    case "press_release":
      return { tier: "know", why: CATEGORY_LABEL[cat] };
    case "agm_egm":
    case "postal_ballot":
      return /result|voting|scrutini/i.test(text)
        ? { tier: "know", why: "Shareholder vote result" }
        : { tier: "routine", why: "Meeting notice" };
    default:
      return { tier: "routine", why: "Paperwork" };
  }
}
