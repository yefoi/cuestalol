"use client";

import {
  IconCalculator,
  IconCoins,
  IconLink,
  IconSparkles,
  IconTag,
  IconTokens,
} from "@/components/icons";
import { Badge, Card, SectionHeading, Stat, cn } from "@/components/ui";
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

  const isPeak = catalog.isPeak;

  return (
    <div className="flex flex-col gap-4">
      <Card className="animate-rise">
        <SectionHeading
          title="Precios de referencia"
          subtitle="Precios en USD por 1M de tokens. La tarifa valle es la mitad de la punta."
          icon={<IconTag className="size-4" />}
          action={
            <Badge tone={isPeak ? "amber" : "green"}>
              {isPeak ? "Hora punta" : "Hora valle"}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Proveedor"
            value={catalog.provider?.label ?? "—"}
            tone="sky"
            icon={<IconLink className="size-3.5" />}
          />
          <Stat
            label="Tarifa actual"
            value={isPeak ? "Punta" : "Valle"}
            tone={isPeak ? "amber" : "green"}
            hint={`Punta: ${catalog.peakHours}`}
            icon={<IconCoins className="size-3.5" />}
          />
          <Stat
            label="Modelos"
            value={`${catalog.models.length}`}
            hint={catalog.provider?.note}
            icon={<IconSparkles className="size-3.5" />}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Endpoint: <code className="text-slate-400">{catalog.baseUrl}</code> ·
          Hora servidor (UTC):{" "}
          {new Date(catalog.serverTimeUtc).toLocaleTimeString("es-ES")}
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {catalog.models.map((model) => (
          <ModelCard key={model.id} model={model} isPeak={isPeak} />
        ))}
      </div>

      <Card className="animate-rise">
        <SectionHeading
          title="¿Cómo se calcula el coste?"
          icon={<IconCalculator className="size-4" />}
        />
        <ul className="mt-1 list-disc space-y-1.5 pl-4 text-sm text-slate-400">
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

function ModelCard({ model, isPeak }: { model: ModelInfo; isPeak: boolean }) {
  const active = isPeak ? model.pricing.peak : model.pricing.offPeak;

  return (
    <Card interactive className="animate-rise">
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent px-3.5 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Entrada · miss
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-emerald-300">
            {formatUsd(active.cacheMissInput)}
          </div>
          <div className="text-[11px] text-slate-500">por 1M tokens</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent px-3.5 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Salida
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight text-sky-300">
            {formatUsd(active.output)}
          </div>
          <div className="text-[11px] text-slate-500">por 1M tokens</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="violet">{model.family}</Badge>
        <Badge>
          <IconTokens className="size-3" />
          {formatNumber(model.contextLength)} contexto
        </Badge>
        {model.monthlyLimitUsd ? (
          <Badge tone="green">
            Incluye {formatUsd(model.monthlyLimitUsd)}/mes en Go
          </Badge>
        ) : null}
        {model.supportsThinking ? <Badge tone="sky">Thinking</Badge> : null}
        {model.supportsVision ? <Badge tone="green">Vision</Badge> : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Tarifa</th>
              <th className="px-3 py-2 font-medium">Entrada (hit)</th>
              <th className="px-3 py-2 font-medium">Entrada (miss)</th>
              <th className="px-3 py-2 font-medium">Salida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <TierRow
              label="Valle"
              hit={model.pricing.offPeak.cacheHitInput}
              miss={model.pricing.offPeak.cacheMissInput}
              out={model.pricing.offPeak.output}
              active={!isPeak}
            />
            <TierRow
              label="Punta"
              hit={model.pricing.peak.cacheHitInput}
              miss={model.pricing.peak.cacheMissInput}
              out={model.pricing.peak.output}
              active={isPeak}
            />
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

function TierRow({
  label,
  hit,
  miss,
  out,
  active,
}: {
  label: string;
  hit: number;
  miss: number;
  out: number;
  active: boolean;
}) {
  return (
    <tr className={cn(active && "bg-emerald-400/[0.07]")}>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2 text-slate-300">
          {label}
          {active ? <Badge tone="green">Ahora</Badge> : null}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {formatUsd(hit)}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {formatUsd(miss)}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {formatUsd(out)}
      </td>
    </tr>
  );
}
