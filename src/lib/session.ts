const SESSION_KEY = "cuestalo.session.v1";
let cache: string | null = null;

export function getSessionId(): string {
  if (typeof window === "undefined") return "cuestalo-server";
  if (cache) return cache;
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      cache = existing;
      return existing;
    }
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cuestalo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    cache = id;
    return id;
  } catch {
    cache = `cuestalo-${Math.random().toString(36).slice(2)}`;
    return cache;
  }
}
