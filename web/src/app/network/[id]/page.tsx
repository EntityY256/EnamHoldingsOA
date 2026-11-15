import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, SectionTitle, Strength, Tag } from "@/components/ui";
import { buildFeed, network, networkData, shortName, snapshot } from "@/lib/feed";
import { CATEGORY_LABEL } from "@/lib/engine/classify";
import { sameName } from "@/lib/engine/network";

export function generateStaticParams() {
  return networkData.contacts.map((c) => ({ id: c.id }));
}

export default async function Person({ params }: PageProps<"/network/[id]">) {
  const { id } = await params;
  const c = networkData.contacts.find((x) => x.id === id);
  if (!c) notFound();
  const months = network.monthsSince(c.tie.lastContact);

  // What can this person help with? Portfolio companies where they're an insider, ex-insider or peer.
  const helps = snapshot.companies
    .map((co) => ({ co, link: network.linksToCompany(co.symbol, co.sector).find((l) => l.contact.id === c.id) }))
    .filter((x) => x.link && x.link.kind !== "expert")
    .sort((a, b) => b.link!.score - a.link!.score)
    .slice(0, 6);

  // Recent events at their companies: reasons to call.
  const symbols = new Set(c.roles.map((r) => network.org(r.org)?.symbol).filter(Boolean));
  const feed = buildFeed();
  const events = feed.filter((i) => symbols.has(i.symbol) && i.tier !== "routine").slice(0, 4);
  // People this contact knows who just appeared in a portfolio filing.
  const news = new Map<string, string>();
  for (const i of feed)
    for (const p of i.people ?? [])
      if (!news.has(p.name)) news.set(p.name, `${p.action} ${p.role} at ${i.symbol}`);
  const inNews = (name: string) => [...news.entries()].find(([n]) => sameName(n, name))?.[1];

  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),16px)]">
      <Link href="/network" className="text-[13px] text-muted">
        ‹ Network
      </Link>
      <header className="mt-4 flex items-center gap-3">
        <span className="scale-150 pl-2">
          <Avatar name={c.name} net />
        </span>
        <div className="pl-3">
          <h1 className="text-[22px] font-semibold leading-tight">{c.name}</h1>
          <p className="text-[13px] text-muted">
            {c.headline} · {c.city}
          </p>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border border-net/20 bg-net-bg/50 p-4 text-[14px]">
        <div className="flex items-center gap-2">
          <Strength n={c.tie.strength} />
          <span className="font-medium text-net">{["", "Acquaintance", "Good contact", "Close"][c.tie.strength]}</span>
          <span className="ml-auto text-[12px] text-muted">last spoke {months === 0 ? "this month" : `${months} mo ago`}</span>
        </div>
        <p className="mt-1.5 text-ink-2">{c.tie.how}</p>
        {c.notes && <p className="mt-1.5 text-[13px] text-muted">Note: {c.notes}</p>}
      </div>

      {events.length > 0 && (
        <>
          <SectionTitle>Reasons to call this week</SectionTitle>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-2xl border border-line bg-surface p-3.5">
                <p className="text-[12px] text-muted">
                  <span className="num font-semibold text-ink">{e.symbol}</span> · {CATEGORY_LABEL[e.cat]}
                </p>
                <p className="mt-0.5 text-[14px] leading-snug">{e.summary ?? e.title}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {helps.length > 0 && (
        <>
          <SectionTitle>Can help you on</SectionTitle>
          <ul className="space-y-2">
            {helps.map(({ co, link }) => (
              <li key={co.symbol}>
                <Link href={`/research/${co.symbol}`} className="block rounded-2xl border border-line bg-surface p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="num text-[13px] font-semibold">{co.symbol}</span>
                    <span className="text-[12px] text-muted">{shortName(co.name)}</span>
                    {co.inPortfolio && <Tag tone="accent">portfolio</Tag>}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink-2">{link!.reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {c.knows && c.knows.length > 0 && (
        <>
          <SectionTitle>Knows</SectionTitle>
          <ul className="space-y-1.5 text-[14px]">
            {c.knows.map((k) => (
              <li key={k.name} className="rounded-xl bg-surface-2 px-3 py-2">
                <span className="font-semibold">{k.name}</span> <span className="text-ink-2">· {k.context}</span>
                {inNews(k.name) && <span className="mt-1 block text-[12px] font-medium text-net">In the news: just {inNews(k.name)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Career</SectionTitle>
      <ol className="space-y-3 border-l border-line pl-4">
        {[...c.roles].reverse().map((r, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-bg bg-ink/40" />
            <p className="text-[14px] font-medium">{network.org(r.org)?.name ?? r.org}</p>
            <p className="text-[13px] text-ink-2">
              {r.title} <span className="num text-muted">· {r.from}–{r.to ?? "now"}</span>
            </p>
          </li>
        ))}
      </ol>
      <SectionTitle>Education</SectionTitle>
      <ul className="space-y-1 text-[14px]">
        {c.education.map((e) => (
          <li key={e.school}>
            {e.school} <span className="text-muted">· {e.degree} &apos;{String(e.to).slice(2)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex flex-wrap gap-1.5">
        {c.expertise.map((x) => (
          <Tag key={x} tone="net">
            {x}
          </Tag>
        ))}
      </p>
      <p className="mt-8 text-center text-[11px] text-faint">Synthetic contact for the demo.</p>
    </main>
  );
}
