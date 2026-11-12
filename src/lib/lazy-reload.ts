import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "boveda-chunk-reload";
const RELOAD_WINDOW_MS = 30_000;

/** True when a dynamic import failed because the chunk no longer exists (app was updated). */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(message);
}

/** Reload once to pick up the new build; refuses to loop if a reload just happened. */
export function reloadForNewVersion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage unavailable: still reload once */ }
  window.location.reload();
  return true;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** React.lazy that retries a failed chunk once, then reloads the page to fetch the current version. */
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      await wait(600);
      try {
        return await factory();
      } catch (retryError) {
        if (isChunkLoadError(retryError) && reloadForNewVersion()) return new Promise<never>(() => {});
        throw retryError;
      }
    }
  });
}
