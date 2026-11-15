"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Network, normName, type Link as NetLink, type NetworkData } from "@/lib/engine/network";
import { Avatar, Strength } from "../ui";

const EXAMPLES = ["Anup Bagchi", "semiconductors", "rural lending", "Tata Power", "specialty chemicals", "M&A"];

export function NetworkSearch({ data }: { data: NetworkData }) {
  const [q, setQ] = useState("");
  const net = useMemo(() => new Network(data), [data]);

  const results = useMemo(() => {
    const query = q.trim();
    if (query.length < 2) return null;
    // 1. Is this a person someone in my network knows (second-degree reach)?
    const viaKnows: NetLink[] = [];
    for (const c of data.contacts)
      for (const k of c.knows ?? [])
        if (normName(k.name).includes(normName(query)) && normName(query).length > 3)
          viaKnows.push({ contact: c, kind: "knows", reason: `Knows ${k.name}: ${k.context}.`, score: 10 + k.strength });
    // 2. A company in my orgs list → insiders, ex-insiders, peers.
    const org = net.org(query) ?? data.orgs.find((o) => o.name.toLowerCase().startsWith(query.toLowerCase()));
    const viaOrg = org?.symbol ? net.linksToCompany(org.symbol, {}).slice(0, 6) : [];
    // 3. Free text across careers, schools and expertise.
    const viaText = net.search(query).slice(0, 8);
    const seen = new Set<string>();
    return [...viaKnows, ...viaOrg, ...viaText].filter((l) => !seen.has(l.contact.id) && seen.add(l.contact.id)).slice(0, 8);
  }, [q, data, net]);

  return (
    <div className="mt-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Who knows… a person, company, or theme"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-faint focus:border-net"
      />
      {!results && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => setQ(e)} className="shrink-0 rounded-full bg-net-bg px-3 py-1.5 text-[12px] text-net">
              {e}
            </button>
          ))}
        </div>
      )}
      {results && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-net/25 bg-surface">
          {results.length === 0 && <li className="px-4 py-3 text-[13px] text-muted">No one yet. That&apos;s a gap worth filling.</li>}
          {results.map((l) => (
            <li key={l.contact.id}>
              <Link href={`/network/${l.contact.id}`} className="flex gap-3 px-4 py-3">
                <Avatar name={l.contact.name} net />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{l.contact.name}</span>
                    <Strength n={l.contact.tie.strength} />
                  </div>
                  <p className="text-[13px] leading-snug text-ink-2">{l.reason}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
