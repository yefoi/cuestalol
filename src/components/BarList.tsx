"use client";

import { cn } from "@/components/ui";

export interface BarItem {
  label: string;
  value: number;
  display: string;
  tone?: "green" | "sky" | "amber" | "rose";
}

const tones: Record<NonNullable<BarItem["tone"]>, string> = {
  green: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
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
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {title}
        </span>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2"
          >
            <span className="truncate text-xs text-slate-300" title={item.label}>
              {item.label}
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <span
                className={cn(
                  "block h-full rounded-full transition-all",
                  tones[item.tone ?? "sky"],
                )}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </span>
            <span className="font-mono text-xs text-slate-200">
              {item.display}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
