export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0.00";
  const abs = Math.abs(value);
  if (abs < 0.0001) return `$${value.toFixed(6)}`;
  if (abs < 0.01) return `$${value.toFixed(5)}`;
  if (abs < 1) return `$${value.toFixed(4)}`;
  if (abs < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("es-ES");
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 8) return `${hours.toFixed(1)} h`;
  const days = hours / 8;
  if (days < 5) return `${days.toFixed(1)} días`;
  const weeks = days / 5;
  if (weeks < 4) return `${weeks.toFixed(1)} semanas`;
  const months = days / 21;
  return `${months.toFixed(1)} meses`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}
