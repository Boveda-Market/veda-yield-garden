/** Last good result kept in localStorage so cards show instantly after a reload while fresh data loads. */
export function readCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try { const v = localStorage.getItem(`boveda:cache:${key}`); return v ? (JSON.parse(v) as T) : undefined; } catch { return undefined; }
}
export function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(`boveda:cache:${key}`, JSON.stringify(value)); } catch { /* storage full or disabled */ }
}
