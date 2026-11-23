/** Weekly bold ad: shown at most once per gap; next gap is random 4–7 days so it lands on unpredictable days but at least weekly. */
export const WEEKLY_AD_KEY = "boveda:weekly-ad-next";
const DAY = 24 * 3600_000;
export const MIN_GAP = 4 * DAY;
export const MAX_GAP = 7 * DAY;

/** First visit (no record) is due; afterwards due once the stored next time passes. */
export function weeklyAdDue(next: number | null, now: number): boolean {
  return next == null || Number.isNaN(next) || now >= next;
}

/** Next show time after a view: now + random gap within [4, 7] days. */
export function nextWeeklyAd(now: number, rand: number = Math.random()): number {
  const r = Math.min(Math.max(rand, 0), 1);
  return now + MIN_GAP + Math.round(r * (MAX_GAP - MIN_GAP));
}

/** Set once a person opens, holds or closes a TRUMP position on this device: the TRUMP ad stops for good. */
export const TRUMP_AD_DONE = "boveda:trump-ad-done";
export function markTrumpTouched() { try { localStorage.setItem(TRUMP_AD_DONE, "1"); } catch { /* storage blocked */ } }
export function trumpTouched(): boolean { try { return localStorage.getItem(TRUMP_AD_DONE) === "1"; } catch { return false; } }
/** Positions read from the wallet include the TRUMP vault. */
export const holdsTrump = (positions: { vaultId: string }[] | undefined) => Boolean(positions?.some((p) => p.vaultId === "trump"));

/** Which weekly ad showed last on this device; the rotation alternates TRUMP and Bitcoin. */
export const WEEKLY_AD_LAST = "boveda:weekly-ad-last";
/** Alternate TRUMP ↔ Bitcoin each time; once TRUMP was touched only Bitcoin is shown. */
export function pickWeeklyAd(last: string | null, trumpDone: boolean): "trump" | "btc" {
  if (trumpDone) return "btc";
  return last === "trump" ? "btc" : "trump";
}
