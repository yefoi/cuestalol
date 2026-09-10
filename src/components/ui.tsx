import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        interactive &&
          "transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 max-w-2xl text-sm text-slate-400">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/20",
  ghost:
    "border border-white/12 text-slate-200 hover:border-white/25 hover:bg-white/5",
  subtle: "bg-white/10 text-slate-100 hover:bg-white/15",
  danger:
    "border border-rose-400/30 text-rose-200 hover:bg-rose-400/10",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

type BadgeTone = "neutral" | "green" | "amber" | "sky" | "rose" | "violet";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-white/15 bg-white/5 text-slate-300",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-white/25 border-t-white",
        className,
      )}
      aria-hidden
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("shimmer rounded-xl border border-white/5 bg-white/5", className)}
      aria-hidden
    />
  );
}

type StatTone = "neutral" | "green" | "sky" | "amber" | "rose" | "violet";

const statIconTones: Record<StatTone, string> = {
  neutral: "border-white/10 bg-white/5 text-slate-300",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  sky: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

const statValueTones: Record<StatTone, string> = {
  neutral: "text-slate-100",
  green: "text-emerald-300",
  sky: "text-sky-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
  violet: "text-violet-300",
};

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-slate-950/40 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-lg border",
              statIconTones[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "mt-1.5 text-lg font-semibold tracking-tight",
          statValueTones[tone],
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex min-h-72 flex-col items-center justify-center gap-3 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-emerald-300">
          {icon}
        </span>
      ) : null}
      <p className="text-base font-medium text-slate-200">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-slate-500">{description}</p>
      ) : null}
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-left transition hover:border-white/20"
    >
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-emerald-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition",
            checked ? "left-4.5" : "left-0.5",
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-slate-100">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </span>
    </button>
  );
}
