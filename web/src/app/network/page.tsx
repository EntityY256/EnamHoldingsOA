import Link from "next/link";
import { NetworkSearch } from "@/components/network/NetworkSearch";
import { Avatar, SectionTitle, Strength } from "@/components/ui";
import { buildFeed, network, networkData, type LinkLite } from "@/lib/feed";
import { CATEGORY_LABEL } from "@/lib/engine/classify";

export default function NetworkHome() {
  const items = buildFeed();
  // People who just appeared in your portfolio's filings, and your best path to each.
  const inTheNews = items
    .flatMap((i) => (i.people ?? []).map((p) => ({ ...p, symbol: i.symbol, company: i.company, ts: i.ts })))
    .filter((p) => p.links.length > 0)
    .slice(0, 6);
  const themes = network.expertiseMap().filter((t) => t.contacts.length >= 2).slice(0, 12);
  const warm = network.keepWarm(
    items.filter((i) => i.tier !== "routine").map((i) => ({ symbol: i.symbol, label: `${CATEGORY_LABEL[i.cat].toLowerCase()}: ${i.title}`, ts: i.ts })),
  );
  const contacts = [...networkData.contacts].sort((a, b) => b.tie.strength - a.tie.strength || a.name.localeCompare(b.name));

  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),20px)]">
      <p className="text-[12px] text-net">Network · private to you</p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">Who do I know who can help me understand this?</h1>
      <p className="mt-2 text-[13px] text-muted">
        {contacts.length} people, {new Set(contacts.flatMap((c) => c.roles.map((r) => network.orgKey(r.org)))).size} organisations. Matching happens on your device&apos;s data in code. No AI model ever sees your network.
      </p>

      <NetworkSearch data={networkData} />

      {inTheNews.length > 0 && (
        <>
          <SectionTitle>Your paths to people in the news</SectionTitle>
          <ul className="space-y-2">
            {inTheNews.map((p) => (
              <li key={p.name + p.symbol} className="rounded-2xl border border-line bg-surface p-3.5">
                <p className="text-[12px] text-muted">
                  <span className="num font-semibold text-ink">{p.symbol}</span> · {p.action} {p.role}
                </p>
                <p className="text-[15px] font-semibold">{p.name}</p>
                <PathLine l={p.links[0]} />
              </li>
            ))}
          </ul>
        </>
      )}

      {warm.length > 0 && (
        <>
          <SectionTitle>Keep warm</SectionTitle>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {warm.slice(0, 5).map((w) => (
              <li key={w.contact.id}>
                <Link href={`/network/${w.contact.id}`} className="flex gap-3 px-4 py-3">
                  <Avatar name={w.contact.name} net />
                  <p className="text-[13px] leading-snug text-ink-2">
                    <span className="font-semibold text-ink">{w.contact.name}</span> {w.connection}, which just filed {w.event.label}.{" "}
                    <span className="text-muted">Quiet for {w.months} months.</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Expertise map</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <details key={t.theme} className="group rounded-2xl border border-line bg-surface open:w-full">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px]">
              <span className="font-medium">{t.theme}</span>
              <span className="num text-[11px] text-net">{t.contacts.length}</span>
            </summary>
            <ul className="space-y-1 border-t border-line px-3 py-2 text-[13px]">
              {t.contacts.map((c) => (
                <li key={c.id}>
                  <Link href={`/network/${c.id}`} className="flex items-center gap-2">
                    <Strength n={c.tie.strength} />
                    <span className="font-medium">{c.name}</span>
                    <span className="truncate text-[12px] text-muted">{c.headline}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <SectionTitle right={<span className="text-[11px] text-muted">by tie strength</span>}>Everyone</SectionTitle>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {contacts.map((c) => (
          <li key={c.id}>
            <Link href={`/network/${c.id}`} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{c.name}</p>
                <p className="truncate text-[12px] text-muted">{c.headline}</p>
              </div>
              <Strength n={c.tie.strength} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-[11px] text-faint">Synthetic demo network: all contacts are fictional.</p>
    </main>
  );
}

function PathLine({ l }: { l: LinkLite }) {
  return (
    <Link href={`/network/${l.contactId}`} className="mt-2 flex items-start gap-2 rounded-xl bg-net-bg/60 p-2.5">
      <span className="mt-0.5 text-[12px] font-semibold text-net">You →</span>
      <p className="text-[13px] leading-snug text-ink-2">
        <span className="font-semibold text-net">{l.name}</span> → {l.reason}
      </p>
    </Link>
  );
}
