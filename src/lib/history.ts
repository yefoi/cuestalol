import type { HistoryEntry } from "./types";

const STORAGE_KEY = "cuestalo.history.v1";
const MAX_ENTRIES = 30;
const EMPTY: HistoryEntry[] = [];

let cache: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as HistoryEntry[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function emit() {
  for (const listener of listeners) listener();
}

function persist(next: HistoryEntry[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    try {
      const trimmed = next.slice(0, Math.floor(next.length / 2));
      cache = trimmed;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // cuota agotada: mantenemos solo en memoria
    }
  }
  emit();
}

export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHistorySnapshot(): HistoryEntry[] {
  return read();
}

export function getHistoryServerSnapshot(): HistoryEntry[] {
  return EMPTY;
}

export function addHistoryEntry(entry: HistoryEntry) {
  const next = [entry, ...read().filter((e) => e.id !== entry.id)].slice(
    0,
    MAX_ENTRIES,
  );
  persist(next);
}

export function removeHistoryEntry(id: string) {
  persist(read().filter((entry) => entry.id !== id));
}

export function clearHistory() {
  persist([]);
}

export function makeHistoryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
