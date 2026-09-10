"use client";

import { Badge, Card } from "@/components/ui";
import { formatNumber, formatUsd } from "@/lib/format";
import type { Catalog } from "@/lib/types";
import type { ModelInfo } from "@/lib/models";

interface Props {
  catalog: Catalog | null;
}

export default function PricingPanel({ catalog }: Props) {
  if (!catalog) {
    return (
      <Card>
        <p className="text-sm text-slate-400">Cargando catálogo…</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Precios de referencia</h2>
          <Badge tone={catalog.isPeak ? "amber" : "green"}>
            {catalog.isPeak ? "Hora punta" : "Hora valle"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Precios en USD por 1M de tokens. La tarifa valle es la mitad de la
          tarifa punta. Horas punta: {catalog.peakHours}.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Endpoint: <code className="text-slate-400">{catalog.baseUrl}</code> ·
          Hora servidor (UTC):{" "}
          {new Date(catalog.serverTimeUtc).toLocaleTimeString("es-ES")}
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {catalog.models.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-slate-300">
          ¿Cómo se calcula el coste?
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-400">
          <li>
            Coste = tokens de entrada × precio de entrada + tokens de salida ×
            precio de salida.
          </li>
          <li>
            Los tokens de entrada con <strong>cache hit</strong> cuestan ~50×
            menos que con cache miss.
          </li>
          <li>
            Los tokens de razonamiento (<em>thinking</em>) se facturan como
            tokens de salida.
          </li>
          <li>
            La tarifa valle aplica fuera de las horas punta (fines de semana
            incluidos).
          </li>
        </ul>
      </Card>
    </div>
  );
}

function ModelCard({ model }: { model: ModelInfo }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {model.label}
          </h3>
          <p className="text-xs text-slate-500">{model.version}</p>
        </div>
        <code className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-slate-400">
          {model.id}
        </code>
      </div>

      <p className="mt-2 text-sm text-slate-400">{model.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>Contexto {formatNumber(model.contextLength)}</Badge>
        <Badge>Máx. salida {formatNumber(model.maxOutput)}</Badge>
        {model.supportsThinking ? <Badge tone="sky">Thinking</Badge> : null}
        {model.supportsVision ? <Badge tone="green">Vision</Badge> : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Tarifa</th>
              <th className="px-3 py-2 font-medium">Entrada (hit)</th>
              <th className="px-3 py-2 font-medium">Entrada (miss)</th>
              <th className="px-3 py-2 font-medium">Salida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr>
              <td className="px-3 py-2 text-slate-300">Valle</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.offPeak.cacheHitInput)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.offPeak.cacheMissInput)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.offPeak.output)}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-slate-300">Punta</td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.peak.cacheHitInput)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.peak.cacheMissInput)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {formatUsd(model.pricing.peak.output)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {model.note ? (
        <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/90">
          {model.note}
        </p>
      ) : null}
    </Card>
  );
}
