"use client";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/engine/classify";
import type { AlertSettings } from "@/lib/alerts";

const ALERTABLE = CATEGORIES.filter((c) => !["unclassified", "investor_meetings", "earnings_call", "agm_egm", "postal_ballot"].includes(c));

export function SettingsSheet({ settings, onChange, onClose }: { settings: AlertSettings; onChange: (s: AlertSettings) => void; onClose: () => void }) {
  const toggle = (c: Category) =>
    onChange({ ...settings, watch: settings.watch.includes(c) ? settings.watch.filter((x) => x !== c) : [...settings.watch, c] });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="rise w-full max-w-[480px] rounded-t-3xl bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="text-[18px] font-semibold">What counts as unusual?</h2>
        <p className="mt-1 text-[13px] text-muted">FINN watches end-of-day data and every filing, and only interrupts you when one of these is crossed.</p>

        <label className="mt-5 block">
          <div className="flex justify-between text-[14px]">
            <span>Volume spike</span>
            <span className="num font-semibold">≥ {settings.volumeMultiple.toFixed(1)}× 20-day avg</span>
          </div>
          <input type="range" min={1.2} max={5} step={0.1} value={settings.volumeMultiple} onChange={(e) => onChange({ ...settings, volumeMultiple: +e.target.value })} className="mt-2 w-full accent-[var(--ink)]" />
        </label>
        <label className="mt-4 block">
          <div className="flex justify-between text-[14px]">
            <span>Daily price move</span>
            <span className="num font-semibold">≥ ±{settings.priceMovePct.toFixed(1)}%</span>
          </div>
          <input type="range" min={1} max={12} step={0.5} value={settings.priceMovePct} onChange={(e) => onChange({ ...settings, priceMovePct: +e.target.value })} className="mt-2 w-full accent-[var(--ink)]" />
        </label>

        <div className="mt-5 text-[14px]">Alert me on these filings</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALERTABLE.map((c) => {
            const on = settings.watch.includes(c);
            return (
              <button key={c} onClick={() => toggle(c)} className={`rounded-full px-3 py-1.5 text-[13px] ${on ? "bg-ink text-bg" : "border border-line text-ink-2"}`}>
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-xl bg-ink py-3 text-[15px] font-semibold text-bg">
          Done
        </button>
        <p className="mt-2 text-center text-[11px] text-faint">Saved on this device.</p>
      </div>
    </div>
  );
}
