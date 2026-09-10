"use client";

import { useMemo, useState } from "react";

import BarList, { type BarItem } from "@/components/BarList";
import {
  IconCalculator,
  IconChart,
  IconClock,
  IconCoins,
  IconDownload,
  IconFile,
  IconSparkles,
  IconTokens,
} from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  SectionHeading,
  Skeleton,
  Spinner,
  Stat,
  Toggle,
  cn,
  inputClass,
} from "@/components/ui";
import {
  formatHours,
  formatMs,
  formatNumber,
  formatUsd,
} from "@/lib/format";
import { exportEstimateCsv, exportEstimatePdf } from "@/lib/export";
import { addHistoryEntry, makeHistoryId } from "@/lib/history";
import { getSessionId } from "@/lib/session";
import type { Catalog, EstimateResponse, HistoryEntry } from "@/lib/types";

interface Props {
  catalog: Catalog | null;
  initialEntry?: HistoryEntry | null;
}

const DEFAULT_IDEA =
  "Una app web para que pequeños restaurantes gestionen reservas, menú digital y pedidos para llevar, con panel de administración y pagos online.";

const PROJECT_TYPES = [
  "Web / SaaS",
  "App móvil",
  "API / Backend",
  "E-commerce",
  "Landing page",
  "Extensión / Plugin",
  "IA / Automatización",
  "Videojuego",
  "Otro",
];

const DETAIL_LEVELS = [
  { value: "rapido", label: "Rápido (menos features)" },
  { value: "normal", label: "Normal" },
  { value: "detallado", label: "Detallado (más features)" },
];

export default function EstimatePanel({ catalog, initialEntry }: Props) {
  const [idea, setIdea] = useState(initialEntry?.idea ?? DEFAULT_IDEA);
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [detail, setDetail] = useState("normal");
  const [model, setModel] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [teamSize, setTeamSize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EstimateResponse | null>(
    initialEntry?.estimate ?? null,
  );

  const models = catalog?.models ?? [];
  const effectiveModel = model || catalog?.estimatorModel || "deepseek-flash";

  const cheapest = useMemo(() => {
    if (!data) return null;
    const key = data.tier === "peak" ? "peak" : "offPeak";
    return [...data.aiCosts].sort(
      (a, b) => a[key].miss - b[key].miss,
    )[0];
  }, [data]);

  const costChart = useMemo<BarItem[]>(() => {
    if (!data) return [];
    const key = data.tier === "peak" ? "peak" : "offPeak";
    return data.aiCosts.map((cost) => ({
      label: cost.label,
      value: cost[key].miss,
      display: formatUsd(cost[key].miss),
      tone: cheapest?.modelId === cost.modelId ? "green" : "sky",
    }));
  }, [data, cheapest]);

  async function run() {
    if (idea.trim().length < 10) {
      setError("Describe la idea con más detalle.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          projectType,
          detail,
          model: effectiveModel,
          thinking,
          hourlyRate,
          hoursPerDay,
          teamSize,
          sessionId: getSessionId(),
        }),
      });
      const json = (await res.json()) as EstimateResponse & {
        error?: string;
        raw?: string;
      };
      if (!res.ok) {
        throw new Error(
          json.raw ? `${json.error}\n\n${json.raw}` : json.error ?? "Error.",
        );
      }
      setData(json);
      addHistoryEntry({
        id: makeHistoryId(),
        kind: "estimate",
        createdAt: json.at,
        label: `${json.plan.projectType} · ${idea.slice(0, 90)}`,
        idea,
        estimate: json,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start">
      <Card className="lg:sticky lg:top-6">
        <SectionHeading
          title="Describe tu idea"
          subtitle="La IA la convierte en un presupuesto."
          icon={<IconCalculator className="size-4" />}
        />

        <Field label="Idea o proyecto">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={6}
            className={cn(inputClass, "resize-y")}
            placeholder="Ej: una web para gestionar suscripciones con pagos y panel de admin…"
          />
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Tipo de proyecto">
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className={inputClass}
            >
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type} className="bg-slate-900">
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nivel de detalle">
            <select
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className={inputClass}
            >
              {DETAIL_LEVELS.map((level) => (
                <option
                  key={level.value}
                  value={level.value}
                  className="bg-slate-900"
                >
                  {level.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Modelo estimador"
            hint="Modelo que genera el plan (no afecta al coste del proyecto)."
          >
            <select
              value={effectiveModel}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900">
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Toggle
            checked={thinking}
            onChange={setThinking}
            label="Razonamiento profundo"
            hint="Mejor plan, más lento y caro de generar"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Field label="€/hora">
            <input
              type="number"
              min={0}
              max={1000}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Horas/día">
            <input
              type="number"
              min={1}
              max={12}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Devs">
            <input
              type="number"
              min={1}
              max={20}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>

        <Button onClick={run} disabled={loading} className="mt-5 w-full">
          {loading ? <Spinner /> : <IconSparkles className="size-4" />}
          {loading ? "Estimando…" : "Estimar proyecto"}
        </Button>

        {data ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => exportEstimateCsv(data)}>
              <IconFile className="size-4" />
              CSV
            </Button>
            <Button variant="ghost" onClick={() => exportEstimatePdf(data)}>
              <IconDownload className="size-4" />
              PDF
            </Button>
          </div>
        ) : null}

        {error ? (
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </pre>
        ) : null}
      </Card>

      <div className="flex flex-col gap-4">
        {!data && !loading ? (
          <EmptyState
            icon={<IconCalculator className="size-7" />}
            title="Obtén un desglose de esfuerzo, tokens y coste"
            description="La IA descompone la idea en funcionalidades, estima horas de desarrollo y tokens, y calcula el coste con cada modelo."
          />
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        ) : null}

        {data ? (
          <>
            <Card className="animate-rise">
              <SectionHeading
                title={data.plan.projectType}
                subtitle={data.plan.summary || undefined}
                icon={<IconSparkles className="size-4" />}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="amber">
                      Complejidad {data.plan.complexity}
                    </Badge>
                    <Badge tone="sky">
                      {data.totals.featureCount} funcionalidades
                    </Badge>
                  </div>
                }
              />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Esfuerzo humano"
                  value={formatHours(data.totals.humanHours)}
                  tone="sky"
                  icon={<IconClock className="size-3.5" />}
                />
                <Stat
                  label="Esfuerzo por dev"
                  value={formatHours(
                    data.totals.humanHours / data.schedule.teamSize,
                  )}
                  hint={`${data.schedule.teamSize} dev(s)`}
                  icon={<IconCalculator className="size-3.5" />}
                />
                <Stat
                  label="Coste desarrollo"
                  value={formatUsd(data.schedule.humanCost)}
                  tone="green"
                  icon={<IconCoins className="size-3.5" />}
                />
                <Stat
                  label="Tokens IA"
                  value={formatNumber(data.totals.aiTotalTokens)}
                  tone="violet"
                  icon={<IconTokens className="size-3.5" />}
                />
              </div>
            </Card>

            <Card className="animate-rise">
              <SectionHeading
                title="Coste de IA para construir el proyecto"
                subtitle={`Tokens estimados: ${formatNumber(data.totals.aiInputTokens)} entrada + ${formatNumber(data.totals.aiOutputTokens)} salida · tarifa actual ${data.tier === "peak" ? "punta" : "valle"}.`}
                icon={<IconCoins className="size-4" />}
              />

              <div className="mt-1">
                <BarList
                  title="Coste IA por modelo (tarifa actual)"
                  items={costChart}
                />
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Modelo</th>
                      <th className="px-3 py-2 font-medium">Valle respaldo</th>
                      <th className="px-3 py-2 font-medium">Valle con caché</th>
                      <th className="px-3 py-2 font-medium">Punta respaldo</th>
                      <th className="px-3 py-2 font-medium">Punta con caché</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.aiCosts.map((cost) => (
                      <tr
                        key={cost.modelId}
                        className={cn(
                          cheapest?.modelId === cost.modelId &&
                            "bg-emerald-400/[0.07]",
                        )}
                      >
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2 text-slate-200">
                            {cost.label}
                            {cheapest?.modelId === cost.modelId ? (
                              <Badge tone="green">Más barato</Badge>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-300">
                          {formatUsd(cost.offPeak.miss)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {formatUsd(cost.offPeak.cached50)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-300">
                          {formatUsd(cost.peak.miss)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {formatUsd(cost.peak.cached50)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                &quot;Con caché&quot; asume un 50% de tokens de entrada en cache
                hit. &quot;Respaldo&quot; asume 0% de caché (escenario
                pesimista).
              </p>
            </Card>

            <Card className="animate-rise">
              <SectionHeading
                title="Funcionalidades"
                subtitle={`${data.totals.featureCount} tareas desglosadas.`}
                icon={<IconChart className="size-4" />}
              />
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Funcionalidad</th>
                      <th className="px-3 py-2 font-medium">Complejidad</th>
                      <th className="px-3 py-2 font-medium">Horas</th>
                      <th className="px-3 py-2 font-medium">Tokens in/out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.plan.features.map((feature, index) => (
                      <tr key={`${feature.name}-${index}`}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-200">
                            {feature.name}
                          </div>
                          {feature.description ? (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {feature.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={complexityTone(feature.complexity)}>
                            {feature.complexity}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {feature.humanHours.toFixed(1)} h
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {formatNumber(feature.aiInputTokens)} /{" "}
                          {formatNumber(feature.aiOutputTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {(data.plan.assumptions.length > 0 ||
              data.plan.risks.length > 0 ||
              data.plan.suggestedStack.length > 0 ||
              data.plan.notes) ? (
              <Card className="animate-rise">
                <SectionHeading
                  title="Stack, supuestos y riesgos"
                  icon={<IconSparkles className="size-4" />}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {data.plan.suggestedStack.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">
                        Stack sugerido
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {data.plan.suggestedStack.map((item) => (
                          <Badge key={item} tone="sky">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {data.plan.assumptions.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">
                        Supuestos
                      </h4>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-400">
                        {data.plan.assumptions.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {data.plan.risks.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">
                        Riesgos
                      </h4>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-400">
                        {data.plan.risks.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {data.plan.notes ? (
                    <div className="sm:col-span-2">
                      <h4 className="text-sm font-semibold text-slate-300">
                        Notas
                      </h4>
                      <p className="mt-2 text-sm text-slate-400">
                        {data.plan.notes}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <p className="flex items-center gap-2 px-1 text-xs text-slate-500">
              <IconClock className="size-3.5" />
              Esta estimación costó {formatUsd(data.estimationCall.totalCost)} y
              tardó {formatMs(data.timing.totalMs)} (
              {formatNumber(data.usage.completionTokens)} tokens de salida).
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function complexityTone(
  value: string,
): "green" | "amber" | "rose" | "neutral" {
  const v = value.toLowerCase();
  if (v.startsWith("baj")) return "green";
  if (v.startsWith("alt")) return "rose";
  if (v.startsWith("med")) return "amber";
  return "neutral";
}
