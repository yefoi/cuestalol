"use client";

import { useMemo, useState } from "react";

import BarList, { type BarItem } from "@/components/BarList";
import {
  IconBolt,
  IconChart,
  IconCheck,
  IconClock,
  IconCoins,
  IconCompare,
  IconCopy,
  IconSignal,
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
import { exportCompareCsv } from "@/lib/export";
import { formatMs, formatNumber, formatUsd } from "@/lib/format";
import { addHistoryEntry, makeHistoryId } from "@/lib/history";
import { getSessionId } from "@/lib/session";
import type { Catalog, CompareResponse, HistoryEntry } from "@/lib/types";

interface Props {
  catalog: Catalog | null;
  initialEntry?: HistoryEntry | null;
}

const DEFAULT_PROMPT =
  "Escribe una función en TypeScript que calcule la mediana de un array de números y explica su complejidad temporal.";
const DEFAULT_SYSTEM =
  "Eres un ingeniero de software experto. Responde de forma concisa.";

export default function ComparePanel({ catalog, initialEntry }: Props) {
  const [prompt, setPrompt] = useState(initialEntry?.prompt ?? DEFAULT_PROMPT);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1200);
  const [thinking, setThinking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompareResponse | null>(
    initialEntry?.compare ?? null,
  );

  const models = useMemo(() => catalog?.models ?? [], [catalog]);
  const effectiveSelected = selected ?? catalog?.defaults ?? [];

  function toggleModel(id: string) {
    const base = effectiveSelected;
    setSelected(
      base.includes(id) ? base.filter((m) => m !== id) : [...base, id],
    );
  }

  async function run() {
    if (!prompt.trim()) {
      setError("Escribe un prompt.");
      return;
    }
    if (effectiveSelected.length === 0) {
      setError("Selecciona al menos un modelo.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          system,
          models: effectiveSelected,
          temperature,
          maxTokens,
          thinking,
          sessionId: getSessionId(),
        }),
      });
      const json = (await res.json()) as CompareResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error en la comparación.");
      setData(json);
      addHistoryEntry({
        id: makeHistoryId(),
        kind: "compare",
        createdAt: json.at,
        label: prompt.slice(0, 120),
        prompt,
        compare: json,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const { fastest, cheapest } = useMemo(() => {
    if (!data)
      return { fastest: null as string | null, cheapest: null as string | null };
    const ok = data.results.filter((r) => r.ok);
    const fastestModel = [...ok]
      .filter((r) => (r.ttftMs ?? 0) > 0)
      .sort((a, b) => (a.ttftMs ?? 0) - (b.ttftMs ?? 0))[0]?.model;
    const cheapestModel = [...ok]
      .filter((r) => r.cost)
      .sort((a, b) => (a.cost?.totalCost ?? 0) - (b.cost?.totalCost ?? 0))[0]
      ?.model;
    return {
      fastest: fastestModel ?? null,
      cheapest: cheapestModel ?? null,
    };
  }, [data]);

  const labelFor = (id: string) => models.find((m) => m.id === id)?.label ?? id;

  const charts = useMemo(() => {
    if (!data) return null;
    const ok = data.results.filter((r) => r.ok);
    if (!ok.length) return null;
    const label = (id: string) =>
      models.find((m) => m.id === id)?.label ?? id;
    return {
      cost: ok.map<BarItem>((r) => ({
        label: label(r.model),
        value: r.cost?.totalCost ?? 0,
        display: formatUsd(r.cost?.totalCost ?? 0),
        tone: "green",
      })),
      ttft: ok.map<BarItem>((r) => ({
        label: label(r.model),
        value: r.ttftMs ?? 0,
        display: formatMs(r.ttftMs ?? 0),
        tone: "sky",
      })),
      speed: ok.map<BarItem>((r) => ({
        label: label(r.model),
        value: r.tokensPerSecond ?? 0,
        display: `${(r.tokensPerSecond ?? 0).toFixed(0)} tok/s`,
        tone: "amber",
      })),
    };
  }, [data, models]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
      <Card className="lg:sticky lg:top-6">
        <SectionHeading
          title="Prompt"
          subtitle="Envíalo a varios modelos a la vez."
          icon={<IconCompare className="size-4" />}
          action={
            <Button
              variant="ghost"
              className="px-3 py-1 text-xs"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Ocultar" : "Opciones"}
            </Button>
          }
        />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className={cn(inputClass, "resize-y font-mono text-[13px]")}
          placeholder="Escribe lo que quieres enviar a los modelos…"
        />

        {showAdvanced ? (
          <div className="mt-4 flex flex-col gap-4">
            <Field label="System prompt">
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={3}
                className={cn(inputClass, "resize-y text-[13px]")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Temperatura · ${temperature.toFixed(1)}`}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="accent-emerald-400"
                />
              </Field>
              <Field label="Máx. tokens salida">
                <input
                  type="number"
                  min={64}
                  max={16384}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <Toggle
              checked={thinking}
              onChange={setThinking}
              label="Modo razonamiento"
              hint="Activa thinking: más tokens y latencia"
            />
          </div>
        ) : null}

        <div className="mt-5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Modelos
          </span>
          <div className="mt-2 grid gap-2">
            {models.map((model) => {
              const active = effectiveSelected.includes(model.id);
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => toggleModel(model.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-emerald-400/50 bg-emerald-400/10"
                      : "border-white/10 bg-slate-950/40 hover:border-white/20",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-100">
                      {model.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {model.version}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border transition",
                      active
                        ? "border-emerald-400 bg-emerald-400 text-slate-950"
                        : "border-white/25 text-transparent",
                    )}
                  >
                    <IconCheck className="size-3.5" strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
            {!models.length ? (
              <p className="text-sm text-slate-500">Cargando modelos…</p>
            ) : null}
          </div>
        </div>

        <Button onClick={run} disabled={loading} className="mt-5 w-full">
          {loading ? <Spinner /> : <IconBolt className="size-4" />}
          {loading ? "Midiendo…" : "Comparar modelos"}
        </Button>

        {data ? (
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => exportCompareCsv(data)}
          >
            <IconSparkles className="size-4" />
            Exportar CSV
          </Button>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-col gap-4">
        {!data && !loading ? (
          <EmptyState
            icon={<IconCompare className="size-7" />}
            title="Compara modelos de un vistazo"
            description="Latencia hasta el primer token (TTFT), tiempo total, tokens de entrada/salida/razonamiento y coste en hora punta y valle."
          />
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-64" />
          </div>
        ) : null}

        {charts ? (
          <Card className="animate-rise">
            <SectionHeading
              title="Comparativa visual"
              icon={<IconChart className="size-4" />}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <BarList title="Coste" items={charts.cost} />
              <BarList title="TTFT" items={charts.ttft} />
              <BarList title="Velocidad" items={charts.speed} />
            </div>
          </Card>
        ) : null}

        {data?.results.map((result) => {
          const winner = fastest === result.model || cheapest === result.model;
          return (
            <Card
              key={result.model}
              className={cn(
                "animate-rise",
                winner && "ring-1 ring-emerald-400/30",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  {labelFor(result.model)}
                </h3>
                <code className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-slate-400">
                  {result.model}
                </code>
                {fastest === result.model ? (
                  <Badge tone="green">
                    <IconBolt className="size-3" />
                    Más rápido
                  </Badge>
                ) : null}
                {cheapest === result.model ? (
                  <Badge tone="sky">
                    <IconCoins className="size-3" />
                    Más barato
                  </Badge>
                ) : null}
                {!result.ok ? <Badge tone="rose">Error</Badge> : null}
              </div>

              {!result.ok ? (
                <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {result.error}
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="TTFT"
                      value={formatMs(result.ttftMs ?? 0)}
                      tone="sky"
                      icon={<IconClock className="size-3.5" />}
                    />
                    <Stat
                      label="Tiempo total"
                      value={formatMs(result.totalMs ?? 0)}
                      icon={<IconClock className="size-3.5" />}
                    />
                    <Stat
                      label="Velocidad"
                      value={`${(result.tokensPerSecond ?? 0).toFixed(0)} tok/s`}
                      tone="amber"
                      icon={<IconSignal className="size-3.5" />}
                    />
                    <Stat
                      label="Coste"
                      value={formatUsd(result.cost?.totalCost ?? 0)}
                      tone="green"
                      icon={<IconCoins className="size-3.5" />}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                      label="Tokens entrada"
                      value={formatNumber(result.usage?.promptTokens ?? 0)}
                      icon={<IconTokens className="size-3.5" />}
                    />
                    <Stat
                      label="Tokens salida"
                      value={formatNumber(result.usage?.completionTokens ?? 0)}
                      icon={<IconTokens className="size-3.5" />}
                    />
                    <Stat
                      label="Razonamiento"
                      value={formatNumber(result.usage?.reasoningTokens ?? 0)}
                      tone="violet"
                      icon={<IconSparkles className="size-3.5" />}
                    />
                    <Stat
                      label="Cache hit"
                      value={formatNumber(result.usage?.cachedTokens ?? 0)}
                      icon={<IconTokens className="size-3.5" />}
                    />
                  </div>

                  {result.cost ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-3 py-2 font-medium">Tarifa</th>
                            <th className="px-3 py-2 font-medium">Entrada</th>
                            <th className="px-3 py-2 font-medium">Salida</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          <CostRow
                            label="Valle"
                            input={result.cost.offPeak.inputCost}
                            output={result.cost.offPeak.outputCost}
                            total={result.cost.offPeak.totalCost}
                            active={result.cost.nowTier === "off-peak"}
                          />
                          <CostRow
                            label="Punta"
                            input={result.cost.peak.inputCost}
                            output={result.cost.peak.outputCost}
                            total={result.cost.peak.totalCost}
                            active={result.cost.nowTier === "peak"}
                          />
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
                    <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-3 py-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        Respuesta
                      </span>
                      <CopyButton text={result.content ?? ""} />
                    </div>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-[13px] leading-relaxed text-slate-200">
                      {result.content || "(sin contenido)"}
                    </pre>
                  </div>

                  {result.reasoning ? (
                    <details className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                      <summary className="cursor-pointer text-sm text-slate-400">
                        Ver razonamiento interno
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[12px] text-slate-400">
                        {result.reasoning}
                      </pre>
                    </details>
                  ) : null}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      className="px-2.5 py-1 text-[11px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // portapapeles no disponible
        }
      }}
    >
      {copied ? (
        <IconCheck className="size-3.5 text-emerald-300" />
      ) : (
        <IconCopy className="size-3.5" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

function CostRow({
  label,
  input,
  output,
  total,
  active,
}: {
  label: string;
  input: number;
  output: number;
  total: number;
  active: boolean;
}) {
  return (
    <tr className={active ? "bg-emerald-400/[0.07]" : undefined}>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2 text-slate-300">
          {label}
          {active ? <Badge tone="green">Ahora</Badge> : null}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {formatUsd(input)}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-400">
        {formatUsd(output)}
      </td>
      <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-100">
        {formatUsd(total)}
      </td>
    </tr>
  );
}
