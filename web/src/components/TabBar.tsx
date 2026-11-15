"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Brief", icon: BriefIcon, match: (p: string) => p === "/" },
  { href: "/research", label: "Research", icon: ResearchIcon, match: (p: string) => p.startsWith("/research") },
  { href: "/network", label: "Network", icon: NetworkIcon, match: (p: string) => p.startsWith("/network") },
];

export function TabBar() {
  return <TabBarView path={usePathname() ?? "/"} />;
}

/** Static render used as the Suspense fallback (usePathname suspends on dynamic routes). */
export function TabBarView({ path }: { path: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] justify-around px-4 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.match(path);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex w-24 flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide ${active ? (t.href === "/network" ? "text-net" : "text-ink") : "text-faint"}`}
            >
              <t.icon active={active} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function BriefIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round">
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="19" cy="17" r="2.5" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}
function ResearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5M8 12V10M10.5 12V8.5M13 12v-1.5" />
    </svg>
  );
}
function NetworkIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round">
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="17" r="2.5" fill={active ? "currentColor" : "none"} />
      <path d="M8 8.5l3 6.3M16.3 7.8l-3.2 7M8.5 6.8l7-.6" />
    </svg>
  );
}
