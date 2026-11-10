import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";

export const AUTO_DISMISS_MS = 6000;

/** Notification wrapper: ✕ button, auto-dismiss after `ms` with a progress bar, paused while hovered or touched. */
export function Dismissible({ onDismiss, ms = AUTO_DISMISS_MS, className = "", children }: { onDismiss: () => void; ms?: number; className?: string; children: ReactNode }) {
  const t = useT();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(ms);
  const started = useRef(0);
  const cb = useRef(onDismiss);
  cb.current = onDismiss;
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(() => cb.current(), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started.current)); };
  }, [paused]);
  return <div className={`relative overflow-hidden ${className}`} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <button type="button" aria-label={t("Cerrar")} onClick={() => cb.current()} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground"><X size={14} /></button>
    {children}
    <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left bg-current opacity-30" style={{ animation: `dismiss-bar ${ms}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }} />
  </div>;
}
