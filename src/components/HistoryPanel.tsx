"use client";

import {
  IconCalculator,
  IconCompare,
  IconHistory,
  IconTrash,
} from "@/components/icons";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { formatUsd } from "@/lib/format";
import type { HistoryEntry } from "@/lib/types";

interface Props {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function HistoryPanel({
  entries,
  onRestore,
  onRemove,
  onClear,
}: Props) {
  if (!entries.length) {
    return (
      <EmptyState
        icon={<IconHistory className="size-7" />}
        title="Todavía no hay historial"
        description="Las comparaciones y estimaciones se guardan en este navegador automáticamente. Haz una y aparecerá aquí."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{entries.length}</span>{" "}
          elemento(s) guardados en este navegador.
        </p>
        <Button
          variant="danger"
          className="px-3 py-1.5 text-xs"
          onClick={onClear}
        >
          <IconTrash className="size-3.5" />
          Vaciar historial
        </Button>
      </div>

      <div className="grid gap-3">
        {entries.map((entry) => {
          const meta = describe(entry);
          const isCompare = entry.kind === "compare";
          return (
            <Card
              key={entry.id}
              interactive
              className="flex flex-wrap items-center gap-3 animate-rise"
            >
              <span
                className={
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border " +
                  (isCompare
                    ? "border-sky-400/25 bg-sky-400/10 text-sky-300"
                    : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300")
                }
              >
                {isCompare ? (
                  <IconCompare className="size-5" />
                ) : (
                  <IconCalculator className="size-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isCompare ? "sky" : "green"}>
                    {isCompare ? "Comparación" : "Estimación"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
                <p
                  className="mt-1 truncate text-sm text-slate-200"
                  title={entry.label}
                >
                  {entry.label || "(sin título)"}
                </p>
                {meta ? (
                  <p className="mt-0.5 text-xs text-slate-500">{meta}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="subtle"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => onRestore(entry)}
                >
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => onRemove(entry.id)}
                  aria-label="Eliminar"
                >
                  <IconTrash className="size-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function describe(entry: HistoryEntry): string {
  if (entry.kind === "estimate" && entry.estimate) {
    const { totals, schedule, plan } = entry.estimate;
    return `${plan.projectType} · ${totals.featureCount} funcionalidades · ~${formatUsd(
      schedule.humanCost,
    )} desarrollo · ${totals.aiTotalTokens.toLocaleString("es-ES")} tokens IA`;
  }
  if (entry.kind === "compare" && entry.compare) {
    const models = entry.compare.results.length;
    const errors = entry.compare.results.filter((r) => !r.ok).length;
    return `${models} modelo(s)${errors ? ` · ${errors} con error` : ""} · tarifa ${
      entry.compare.tier
    }`;
  }
  return "";
}
