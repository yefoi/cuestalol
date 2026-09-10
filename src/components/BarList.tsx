"use client";

import { cn } from "@/components/ui";

export interface BarItem {
  label: string;
  value: number;
  display: string;
  tone?: "green" | "sky" | "amber" | "rose";
}

const tones: Record<NonNullable<BarItem["tone"]>, string> = {
  green: "from-emerald-400 to-teal-400 shadow-emerald-500/30",
  sky: "from-sky-400 to-cyan-400 shadow-sky-500/30",
  amber: "from-amber-400 to-orange-400 shadow-amber-500/30",
  rose: "from-rose-400 to-pink-400 shadow-rose-500/30",
};

export default function BarList({
  title,
  items,
  hint,
}: {
  title: string;
  items: BarItem[];
  hint?: string;
}) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3.5">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {hint ? (
          <span className="text-[11px] text-slate-500">{hint}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="truncate text-xs font-medium text-slate-300"
                title={item.label}
              >
                {item.label}
              </span>
              <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">
                {item.display}
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/5">
              <span
                className={cn(
                  "block h-full rounded-full bg-gradient-to-r shadow-[0_0_12px_-2px] transition-[width] duration-700 ease-out",
                  tones[item.tone ?? "sky"],
                )}
                style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
