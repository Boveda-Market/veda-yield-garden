/** Display-only controls, scoped to this browser; never authentication state. */
export const OPEN_SOFIA = "boveda:ask-sofia";
export const SOFIA_TOUR_ACTIVE = "boveda:sofia-tour-active";
export const TOUR_CANCEL_KEY = "boveda:tour-cancel-notified";
export const TOUR_BANNER_KEY = "boveda:tour-banner-dismissed";
export const SOFIA_REST_KEY = "boveda:sofia-rest";
export const SOFIA_REST_MS = 7 * 24 * 60 * 60 * 1000;
export type SofiaRest = { closes: number; until: number };

export function parseSofiaRest(raw: string | null): SofiaRest {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (value && typeof value === "object" && "closes" in value && "until" in value &&
      typeof value.closes === "number" && Number.isSafeInteger(value.closes) && value.closes >= 0 &&
      typeof value.until === "number" && Number.isFinite(value.until) && value.until >= 0) {
      return { closes: value.closes, until: value.until };
    }
  } catch { /* Ignore invalid display preferences. */ }
  return { closes: 0, until: 0 };
}

export function nextSofiaRest(state: SofiaRest, now: number): SofiaRest {
  const closes = state.until > 0 && state.until <= now ? 1 : state.closes + 1;
  return closes >= 2 ? { closes: 0, until: now + SOFIA_REST_MS } : { closes, until: 0 };
}

const seen = new Set<string>();
export function markOnce(key: string, storage: Pick<Storage, "getItem" | "setItem">): boolean {
  try {
    if (storage.getItem(key) === "1") return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }
}

export function askSofiaFromMenu() {
  window.dispatchEvent(new Event(OPEN_SOFIA));
}