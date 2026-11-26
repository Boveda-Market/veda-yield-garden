import { useSyncExternalStore } from "react";

/** Device-local display preferences (never security or money settings). */
const KEYS = { privacy: "boveda:hide-balances", home: "boveda:home", contacts: "boveda:contacts" } as const;
export const HOME_OPTIONS = ["/wallet", "/portfolio", "/app"] as const;
export type HomePath = (typeof HOME_OPTIONS)[number];
export type Contact = { name: string; address: string };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); const on = (e: StorageEvent) => { if (e.key?.startsWith("boveda:")) l(); }; window.addEventListener("storage", on); return () => { listeners.delete(l); window.removeEventListener("storage", on); }; };
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } emit(); };

export const MASK = "$••••";
export function useHideBalances() {
  const hidden = useSyncExternalStore(subscribe, () => read(KEYS.privacy) === "1", () => false);
  return [hidden, (v: boolean) => write(KEYS.privacy, v ? "1" : "0")] as const;
}
export function parseHome(v: string | null): HomePath { return (HOME_OPTIONS as readonly string[]).includes(v ?? "") ? (v as HomePath) : "/wallet"; }
/** Closing Sofía lasts only for this tab's session, not a permanent opt-out. */
const SOFIA_SESSION_KEY = "boveda:hide-sofia-session";
let sofiaFallback = false;
const readSofiaHidden = () => { try { return sessionStorage.getItem(SOFIA_SESSION_KEY) === "1"; } catch { return sofiaFallback; } };
export function useHideSofia() {
  const hidden = useSyncExternalStore(subscribe, readSofiaHidden, () => false);
  return [hidden, (v: boolean) => {
    sofiaFallback = v;
    try {
      if (v) sessionStorage.setItem(SOFIA_SESSION_KEY, "1");
      else sessionStorage.removeItem(SOFIA_SESSION_KEY);
    } catch { /* In-memory fallback for browsers that block storage. */ }
    emit();
  }] as const;
}
export function useHomePath() {
  const home = useSyncExternalStore(subscribe, () => parseHome(read(KEYS.home)), () => "/wallet" as HomePath);
  return [home, (v: HomePath) => write(KEYS.home, v)] as const;
}
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function validContact(c: Contact) { return c.name.trim().length > 0 && c.name.trim().length <= 40 && SOLANA_ADDRESS.test(c.address.trim()); }
export function parseContacts(raw: string | null): Contact[] {
  try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v.filter((c) => c && typeof c.name === "string" && typeof c.address === "string" && validContact(c)).slice(0, 30) : []; } catch { return []; }
}
let cache: { raw: string | null; list: Contact[] } = { raw: null, list: [] };
export function useContacts() {
  const list = useSyncExternalStore(subscribe, () => { const raw = read(KEYS.contacts); if (raw !== cache.raw) cache = { raw, list: parseContacts(raw) }; return cache.list; }, () => cache.list);
  return [list, (next: Contact[]) => write(KEYS.contacts, JSON.stringify(next.slice(0, 30)))] as const;
}

/** Device-local hint that this browser has signed in before (UI only, never trusted for access). */
const RETURNING_KEY = "boveda:returning";
export const markReturning = () => { try { localStorage.setItem(RETURNING_KEY, "1"); } catch { /* ignore */ } };
export const isReturning = () => { try { return localStorage.getItem(RETURNING_KEY) === "1"; } catch { return false; } };
