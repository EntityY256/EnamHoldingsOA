"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TickerSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = () => {
    const s = q.trim().toUpperCase().replace(/\.NS$/, "");
    if (s) router.push(`/research/${encodeURIComponent(s)}`);
  };
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Any NSE ticker, e.g. PIIND, BEL, MARICO"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="num min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-[15px] uppercase outline-none placeholder:normal-case placeholder:text-faint focus:border-ink"
      />
      <button className="rounded-xl bg-ink px-4 text-[15px] font-semibold text-bg">Go</button>
    </form>
  );
}
