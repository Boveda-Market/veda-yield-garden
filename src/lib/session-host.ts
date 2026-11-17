import { useSyncExternalStore } from "react";
import type { BovedaSession } from "@/hooks/use-boveda-session";

/**
 * One secure-session engine for the whole app: the root mounts it once (on first demand) and
 * keeps it alive across screens, so moving from the home page to Mi Billetera never restarts it.
 * Pages read the published session here; it is never persisted and only the mounted provider writes it.
 */
let session: BovedaSession | null = null;
let wanted = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function publishSession(value: BovedaSession | null) { session = value; notify(); }
export function requestSessionEngine() { if (wanted) return; wanted = true; notify(); }
export const useHostedSession = () => useSyncExternalStore(subscribe, () => session, () => null);
export const useSessionEngineWanted = () => useSyncExternalStore(subscribe, () => wanted, () => false);
