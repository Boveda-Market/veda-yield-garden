/** Shared, browser-safe rules for the Sofía support chat. */
export const CHAT_LIMIT = 5;
export const CHAT_WINDOW_MS = 60_000;
export const CHAT_GAP_MS = 3_000;
export const CHAT_MAX_CHARS = 600;
export const CHAT_MAX_TURNS = 10;

/** Sliding-window limit: returns ms to wait (0 = allowed). */
export function chatWait(stamps: number[], now: number): number {
  const recent = stamps.filter((s) => now - s < CHAT_WINDOW_MS);
  const last = recent[recent.length - 1];
  if (last !== undefined && now - last < CHAT_GAP_MS) return CHAT_GAP_MS - (now - last);
  if (recent.length >= CHAT_LIMIT) return CHAT_WINDOW_MS - (now - recent[0]!);
  return 0;
}

/** Detects pasted secrets (seed phrases / private keys) so they are never sent. */
export function looksLikeSecret(text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/);
  if (words.length >= 12 && words.length <= 24 && words.every((w) => /^[a-z]{3,8}$/.test(w))) return true;
  return /\b[1-9A-HJ-NP-Za-km-z]{80,90}\b/.test(text) || /\[\s*\d{1,3}(\s*,\s*\d{1,3}){31,}/.test(text);
}

/** Marker the model appends when a report looks like an app bug for the operator. */
export const ESCALATE_TAG = "[[ESCALAR]]";
export const ESCALATE_PER_HOUR = 3;

export function splitEscalation(text: string): { text: string; escalate: boolean } {
  const escalate = text.includes(ESCALATE_TAG);
  return { text: text.split(ESCALATE_TAG).join("").trim(), escalate };
}

/** Max escalations per caller per hour so the operator's Telegram can't be spammed. */
export function escalateAllowed(stamps: number[], now: number): boolean {
  return stamps.filter((s) => now - s < 3_600_000).length < ESCALATE_PER_HOUR;
}
