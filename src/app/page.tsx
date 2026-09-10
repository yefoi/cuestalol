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
import PricingPanel from "@/components/PricingPanel";
import { Badge, Button, Spinner, cn } from "@/components/ui";
import {
  clearHistory,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  removeHistoryEntry,
  subscribeHistory,
} from "@/lib/history";
import type { Catalog, HistoryEntry } from "@/lib/types";

type Tab = "comparar" | "estimar" | "precios" | "historial";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "comparar", label: "Comparador de modelos" },
  { id: "estimar", label: "Estimador de proyectos" },
  { id: "precios", label: "Precios" },
  { id: "historial", label: "Historial" },
];

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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Cuestalo
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Mide tiempo y tokens por modelo, compara latencia y coste, y estima
              cuánto cuesta construir una web, app o idea.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {catalog ? (
              <Badge tone={catalog.isPeak ? "amber" : "green"}>
                {catalog.isPeak ? "Hora punta" : "Hora valle"}
              </Badge>
            ) : null}
            {catalog ? (
              <Badge tone={catalog.hasApiKey ? "green" : "rose"}>
                {catalog.hasApiKey ? "API key detectada" : "Falta API key"}
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={verifyConnection}
              disabled={verifying}
            >
              {verifying ? <Spinner className="size-3" /> : null}
              Verificar conexión
            </Button>
          </div>
        </div>

        {!loadingCatalog && catalog && !catalog.hasApiKey ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Configura <code className="font-mono">DEEPSEEK_API_KEY</code> en{" "}
            <code className="font-mono">.env.local</code> para activar las
            llamadas a la API. Copia{" "}
            <code className="font-mono">.env.example</code> y reinicia el
            servidor.
          </div>
        ) : null}

        {catalog?.verified === false && catalog.verifyError ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {catalog.verifyError}
          </div>
        ) : null}

        {catalog?.verified && catalog.remoteModels ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Conexión correcta. Modelos disponibles en la API:{" "}
            {catalog.remoteModels.join(", ") || "—"}.
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                tab === item.id
                  ? "bg-white/10 text-slate-50"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {item.label}
              {item.id === "historial" && history.length > 0 ? (
                <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {history.length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        {loadingCatalog ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-400">
            <Spinner />
            Cargando…
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

      <footer className="border-t border-white/5 pt-4 text-xs text-slate-500">
        Precios de DeepSeek actualizados a sep. 2026. Los costes son
        estimaciones y no incluyen reintentos, almacenamiento ni otros servicios.
        El historial se guarda solo en este navegador.
      </footer>
    </div>
  );
}
