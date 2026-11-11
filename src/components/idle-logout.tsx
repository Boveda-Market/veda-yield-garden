import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const IDLE_LIMIT_MS = 5 * 60 * 1000;
export const IDLE_WARN_MS = 60 * 1000;
const KEY = "boveda.lastActivity";
const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;

/** Signs the user out after 5 min (also when the app was closed or in background that long) without activity, warning 60 s before. Activity is shared across tabs. */
export function IdleLogout({ active, signedOut, onLogout }: { active: boolean; signedOut?: boolean; onLogout: () => Promise<void> }) {
  const t = useT();
  const [left, setLeft] = useState<number | null>(null);
  const last = useRef(Date.now());
  useEffect(() => { if (signedOut) { try { localStorage.removeItem(KEY); } catch {} } }, [signedOut]);
  useEffect(() => {
    if (!active) { setLeft(null); return; }
    const mark = () => { const now = Date.now(); if (now - last.current < 5000) return; last.current = now; try { localStorage.setItem(KEY, String(now)); } catch {} };
    const expire = () => { setLeft(null); try { localStorage.removeItem(KEY); } catch {} void (async () => { await onLogout(); window.location.assign("/"); })(); };
    // On reopen, a stored timestamp older than the limit means the app sat closed too long.
    let stored = 0; try { stored = Number(localStorage.getItem(KEY) ?? 0); } catch {}
    if (stored && Date.now() - stored >= IDLE_LIMIT_MS) { expire(); return; }
    last.current = Date.now(); try { localStorage.setItem(KEY, String(last.current)); } catch {}
    const onStorage = (e: StorageEvent) => { if (e.key === KEY && e.newValue) last.current = Math.max(last.current, Number(e.newValue)); };
    const tick = () => {
      try { last.current = Math.max(last.current, Number(localStorage.getItem(KEY) ?? 0)); } catch {}
      const remaining = IDLE_LIMIT_MS - (Date.now() - last.current);
      if (remaining <= 0) { expire(); return; }
      setLeft(remaining <= IDLE_WARN_MS ? Math.ceil(remaining / 1000) : null);
    };
    EVENTS.forEach(e => window.addEventListener(e, mark, { passive: true }));
    window.addEventListener("storage", onStorage);
    const onVis = () => { if (document.visibilityState === "hidden") { try { localStorage.setItem(KEY, String(last.current)); } catch {} } else tick(); };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(tick, 1000);
    return () => { EVENTS.forEach(e => window.removeEventListener(e, mark)); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVis); window.clearInterval(id); };
  }, [active, onLogout]);
  if (left === null) return null;
  const stay = () => { last.current = Date.now(); try { localStorage.setItem(KEY, String(last.current)); } catch {} setLeft(null); };
  return <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
      <Clock className="mx-auto mb-3 text-primary" size={32} />
      <h2 className="text-lg font-semibold text-foreground">{t("¿Sigues ahí?")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("Por tu seguridad cerraremos tu sesión por inactividad en")} <span className="font-semibold text-foreground">{left}s</span>.</p>
      <div className="mt-5 grid gap-2">
        <Button onClick={stay}>{t("Mantener sesión abierta")}</Button>
        <Button variant="ghost" onClick={() => void (async () => { await onLogout(); window.location.assign("/"); })()}>{t("Cerrar sesión")}</Button>
      </div>
    </div>
  </div>;
}
