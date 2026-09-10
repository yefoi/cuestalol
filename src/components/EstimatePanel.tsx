"use client";

import { useMemo, useState } from "react";

import BarList, { type BarItem } from "@/components/BarList";
import {
  Badge,
  Button,
  Card,
  Field,
  Spinner,
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
        <h2 className="mb-4 text-lg font-semibold">Describe tu idea</h2>

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
          {loading ? <Spinner /> : null}
          {loading ? "Estimando…" : "Estimar proyecto"}
        </Button>

        {data ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => exportEstimateCsv(data)}>
              Exportar CSV
            </Button>
            <Button variant="ghost" onClick={() => exportEstimatePdf(data)}>
              Exportar PDF
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
          <Card className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-slate-300">
              Obtén un desglose de esfuerzo, tokens y coste.
            </p>
            <p className="max-w-md text-sm text-slate-500">
              La IA descompone la idea en funcionalidades, estima horas de
              desarrollo y tokens de IA, y calcula el coste con cada modelo
              DeepSeek.
            </p>
          </Card>
        ) : null}

        {loading ? (
          <Card className="flex min-h-64 items-center justify-center gap-3">
            <Spinner />
            <span className="text-slate-300">Generando el plan…</span>
          </Card>
        ) : null}

        {data ? (
          <>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">{data.plan.projectType}</Badge>
                <Badge tone="amber">
                  Complejidad {data.plan.complexity}
                </Badge>
                <Badge>{data.totals.featureCount} funcionalidades</Badge>
                <Badge tone="sky">
                  Estimado con {data.model}
                </Badge>
              </div>
              {data.plan.summary ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {data.plan.summary}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  label="Esfuerzo humano"
                  value={formatHours(data.totals.humanHours)}
                />
                <Metric
                  label="Esfuerzo por dev"
                  value={formatHours(
                    data.totals.humanHours / data.schedule.teamSize,
                  )}
                  hint={`${data.schedule.teamSize} dev(s)`}
                />
                <Metric
                  label="Coste desarrollo"
                  value={formatUsd(data.schedule.humanCost)}
                  tone="green"
                />
                <Metric
                  label="Tokens IA"
                  value={formatNumber(data.totals.aiTotalTokens)}
                />
              </div>
            </Card>

            <Card>
              <h3 className="text-base font-semibold">
                Coste de IA para construir el proyecto
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Tokens estimados: {formatNumber(data.totals.aiInputTokens)}{" "}
                entrada + {formatNumber(data.totals.aiOutputTokens)} salida.
                {" "}Tarifa actual: <strong className="text-slate-300">{data.tier === "peak" ? "punta" : "valle"}</strong>.
              </p>

              <div className="mt-4">
                <BarList
                  title="Coste IA por modelo (tarifa actual)"
                  items={costChart}
                />
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
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

            <Card>
              <h3 className="text-base font-semibold">Funcionalidades</h3>
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
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
                        <td className="px-3 py-2 text-xs capitalize text-slate-400">
                          {feature.complexity}
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
              <Card>
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

            <p className="px-1 text-xs text-slate-500">
              Esta estimación costó{" "}
              {formatUsd(data.estimationCall.totalCost)} y tardó{" "}
              {formatMs(data.timing.totalMs)} ({formatNumber(data.usage.completionTokens)} tokens de salida).
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "green";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-sm font-semibold text-slate-100",
          tone === "green" && "text-emerald-300",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-[11px] text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}
