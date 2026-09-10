"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import ComparePanel from "@/components/ComparePanel";
import EstimatePanel from "@/components/EstimatePanel";
import HistoryPanel from "@/components/HistoryPanel";
import PlansPanel from "@/components/PlansPanel";
import PricingPanel from "@/components/PricingPanel";
import {
  IconAlert,
  IconCalculator,
  IconCheck,
  IconCompare,
  IconHistory,
  IconShield,
  IconTag,
  IconWallet,
  LogoMark,
} from "@/components/icons";
import { Badge, Button, Skeleton, Spinner, cn } from "@/components/ui";
import {
  clearHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  removeHistoryEntry,
  subscribeHistory,
} from "@/lib/history";
import type { Catalog, HistoryEntry } from "@/lib/types";

type Tab = "comparar" | "estimar" | "precios" | "planes" | "historial";

const TABS = [
  { id: "comparar", label: "Comparador", icon: IconCompare },
  { id: "estimar", label: "Estimador", icon: IconCalculator },
  { id: "precios", label: "Precios", icon: IconTag },
  { id: "planes", label: "Planes", icon: IconWallet },
  { id: "historial", label: "Historial", icon: IconHistory },
] as const satisfies ReadonlyArray<{ id: Tab; label: string; icon: unknown }>;

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tab, setTab] = useState<Tab>("comparar");
  const [restore, setRestore] = useState<{
    entry: HistoryEntry;
    nonce: number;
  } | null>(null);

  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );

  const fetchCatalog = useCallback(async (verify: boolean) => {
    const res = await fetch(`/api/models${verify ? "?verify=1" : ""}`, {
      cache: "no-store",
    });
    return (await res.json()) as Catalog;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog(false)
      .then((json) => {
        if (!cancelled) setCatalog(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCatalog]);

  async function verifyConnection() {
    setVerifying(true);
    try {
      setCatalog(await fetchCatalog(true));
    } catch {
      // el catálogo ya muestra el estado de error
    } finally {
      setVerifying(false);
    }
  }

  function handleRestore(entry: HistoryEntry) {
    setRestore({ entry, nonce: Date.now() });
    setTab(entry.kind === "compare" ? "comparar" : "estimar");
  }

  const compareEntry =
    restore?.entry.kind === "compare" ? restore.entry : null;
  const estimateEntry =
    restore?.entry.kind === "estimate" ? restore.entry : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="animate-rise relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-28 size-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <LogoMark className="size-14 shrink-0 drop-shadow-[0_4px_20px_rgba(16,185,129,0.25)]" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="gradient-text">Cuestalo</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-400">
                Mide tiempo y tokens por modelo, compara latencia y coste, y
                estima cuánto cuesta construir una web, app o idea.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {catalog?.provider ? (
                  <Badge tone="sky">{catalog.provider.label}</Badge>
                ) : null}
                {catalog ? (
                  <Badge tone={catalog.isPeak ? "amber" : "green"}>
                    {catalog.isPeak ? "Hora punta" : "Hora valle"}
                  </Badge>
                ) : null}
                {catalog ? (
                  <Badge tone={catalog.hasApiKey ? "green" : "rose"}>
                    <IconShield className="size-3" />
                    {catalog.hasApiKey ? "API key OK" : "Falta API key"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="px-3.5 py-2 text-xs"
            onClick={verifyConnection}
            disabled={verifying}
          >
            {verifying ? <Spinner className="size-3.5" /> : <IconShield className="size-3.5" />}
            {verifying ? "Verificando…" : "Verificar conexión"}
          </Button>
        </div>
      </header>

      {!loadingCatalog && catalog && !catalog.hasApiKey ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <IconAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Configura <code className="font-mono">OPENCODE_API_KEY</code> o{" "}
            <code className="font-mono">DEEPSEEK_API_KEY</code> en{" "}
            <code className="font-mono">.env.local</code> para activar las
            llamadas a la API. Copia{" "}
            <code className="font-mono">.env.example</code> y reinicia el
            servidor.
          </span>
        </div>
      ) : null}

      {catalog?.verified === false && catalog.verifyError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <IconAlert className="mt-0.5 size-4 shrink-0" />
          <span>{catalog.verifyError}</span>
        </div>
      ) : null}

      {catalog?.verified && catalog.remoteModels ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <IconCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Conexión correcta. {catalog.remoteModels.length} modelos disponibles
            en la API.
          </span>
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-slate-950/40 p-1.5 backdrop-blur-sm">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-gradient-to-r from-emerald-500/20 to-sky-500/10 text-white ring-1 ring-emerald-400/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition",
                  active ? "text-emerald-300" : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {label}
              {id === "historial" && history.length > 0 ? (
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {history.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <main className="flex-1">
        {loadingCatalog ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <Skeleton className="h-[420px]" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : (
          <>
            <div className={tab === "comparar" ? undefined : "hidden"}>
              <ComparePanel
                key={compareEntry ? `c-${restore?.nonce}` : "c"}
                catalog={catalog}
                initialEntry={compareEntry}
              />
            </div>
            <div className={tab === "estimar" ? undefined : "hidden"}>
              <EstimatePanel
                key={estimateEntry ? `e-${restore?.nonce}` : "e"}
                catalog={catalog}
                initialEntry={estimateEntry}
              />
            </div>
            <div className={tab === "precios" ? undefined : "hidden"}>
              <PricingPanel catalog={catalog} />
            </div>
            <div className={tab === "planes" ? undefined : "hidden"}>
              <PlansPanel catalog={catalog} />
            </div>
            <div className={tab === "historial" ? undefined : "hidden"}>
              <HistoryPanel
                entries={history}
                onRestore={handleRestore}
                onRemove={removeHistoryEntry}
                onClear={clearHistory}
              />
            </div>
          </>
        )}
      </main>

      <footer className="flex flex-col gap-1 border-t border-white/5 pt-5 text-xs text-slate-500">
        <p>
          Precios de referencia a sep. 2026. Los costes son estimaciones y no
          incluyen reintentos, almacenamiento ni otros servicios.
        </p>
        <p>
          El historial se guarda solo en este navegador. Tu API key nunca sale
          del servidor.
        </p>
      </footer>
    </div>
  );
}
