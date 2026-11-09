import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { earningPace, liveEstimate } from "@/lib/live-earnings";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** Live ticker: verified base + estimated accrual; 6 decimals so movement is visible. */
export function LiveEarnings({ base, ratePerMs, since, unit = "$", suffix = "", label }: { base: number; ratePerMs: number; since: number; unit?: string; suffix?: string; label: string }) {
  const t = useT();
  const live = ratePerMs > 0;
  const now = useNow(live);
  const value = liveEstimate(base, ratePerMs, since, now);
  const [pulse, setPulse] = useState(false);
  const last = useRef(value);
  useEffect(() => {
    if (value > last.current) { setPulse(true); const id = window.setTimeout(() => setPulse(false), 450); last.current = value; return () => window.clearTimeout(id); }
    last.current = value;
    return undefined;
  }, [value]);
  const pace = earningPace(ratePerMs);
  const text = value.toFixed(6);
  return <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {live && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>}
      <span>{live ? t("En vivo · generando rendimientos") : label}</span>
    </div>
    {live && <p className="mt-1 text-xs text-muted-foreground">{label}</p>}
    <p className={`mt-1 font-display text-2xl font-semibold tabular-nums text-primary transition-all duration-300 ${pulse ? "scale-[1.02] drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`}>+{unit}{text.slice(0, -4)}<span className="opacity-60">{text.slice(-4)}</span>{suffix}</p>
    {live && <p className="mt-1 text-xs text-muted-foreground tabular-nums">≈ +{unit}{pace.perHour.toFixed(4)}{suffix} / {t("hora")} · ≈ +{unit}{pace.perDay.toFixed(2)}{suffix} / {t("día")}</p>}
  </div>;
}
