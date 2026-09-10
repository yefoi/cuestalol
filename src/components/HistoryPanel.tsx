"use client";

import { Badge, Button, Card } from "@/components/ui";
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
      <Card className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="text-slate-300">Todavía no hay historial.</p>
        <p className="max-w-md text-sm text-slate-500">
          Las comparaciones y estimaciones se guardan en este navegador
          automáticamente. Haz una y aparecerá aquí.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {entries.length} elemento(s) guardados en este navegador.
        </p>
        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onClear}>
          Vaciar historial
        </Button>
      </div>

      <div className="grid gap-3">
        {entries.map((entry) => {
          const meta = describe(entry);
          return (
            <Card key={entry.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={entry.kind === "compare" ? "sky" : "green"}>
                    {entry.kind === "compare" ? "Comparación" : "Estimación"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString("es-ES")}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-200" title={entry.label}>
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
                  className="px-3 py-1.5 text-xs"
                  onClick={() => onRemove(entry.id)}
                >
                  Eliminar
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
