import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const STEPS = ["Contando tus dólares…", "Sumando tus bóvedas…", "Revisando tus ganancias…", "Casi listo…"];

/** Lively placeholder for a big money total: shimmering digits, bouncing coins and rotating friendly steps. */
export function BalanceLoading({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((v) => Math.min(v + 1, STEPS.length - 1)), 1400); return () => clearInterval(id); }, []);
  return <span role="status" aria-live="polite" className="inline-flex flex-col gap-1.5">
    <span aria-hidden className={`balance-shimmer inline-flex items-center gap-1 rounded-xl ${compact ? "h-6 w-20" : "h-10 w-44"}`}>
      <span className="pl-2 font-display text-primary/70">$</span>
      {[0, 1, 2].map((d) => <span key={d} className="balance-coin h-2 w-2 rounded-full bg-primary motion-reduce:animate-none" style={{ animationDelay: `${d * 0.15}s` }} />)}
    </span>
    {!compact && <span key={i} className="balance-step text-xs text-muted-foreground">{t(STEPS[i] ?? "")}</span>}
  </span>;
}
