import Link from "next/link";
import type { LinkLite } from "@/lib/feed";
import { Avatar, Strength } from "./ui";

const KIND_LABEL: Record<LinkLite["kind"], string> = {
  you: "You know them",
  knows: "Knows them",
  colleague: "Ex-colleague",
  classmate: "Studied together",
  "alumni-of-employer": "Same ex-employer",
  insider: "Insider",
  "former-insider": "Ex-insider",
  peer: "Peer company",
  expert: "Sector go-to",
};

/** The Network surfacing inside Push and Pull: the one or two people worth calling, and why. */
export function WhoToCall({ links, title = "Who can help", compact }: { links: LinkLite[]; title?: string; compact?: boolean }) {
  if (!links.length) return null;
  const shown = compact ? links.slice(0, 2) : links;
  return (
    <div className="mt-3 rounded-xl border border-net/20 bg-net-bg/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-net">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="6" cy="7" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="12" cy="17" r="2.5" />
          <path d="M8 8.5l3 6.3M16.3 7.8l-3.2 7" />
        </svg>
        {title}
      </div>
      <ul className="space-y-2.5">
        {shown.map((l) => (
          <li key={l.contactId}>
            <Link href={`/network/${l.contactId}`} className="flex gap-2.5">
              <Avatar name={l.name} net />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-ink">{l.name}</span>
                  <Strength n={l.strength} />
                  <span className="ml-auto shrink-0 text-[11px] text-net">{KIND_LABEL[l.kind]}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{l.reason}</p>
                {l.months >= 6 && <p className="mt-0.5 text-[11px] text-muted">Last spoke {l.months} months ago: a good excuse to reconnect.</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
