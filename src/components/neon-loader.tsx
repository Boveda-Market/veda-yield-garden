import { useEffect, useState } from "react";
import { Vault as VaultIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Waiting screen: pulsing neon vault + filling bar. Appears only after `delay` ms so fast loads never flash. */
export function NeonLoader({ label, delay = 250, minHeight = "min-h-[50vh]" }: { label?: string; delay?: number; minHeight?: string }) {
  const t = useT();
  const [show, setShow] = useState(delay === 0);
  useEffect(() => { if (delay === 0) return; const id = setTimeout(() => setShow(true), delay); return () => clearTimeout(id); }, [delay]);
  return <div role="status" aria-live="polite" className={`grid place-items-center ${minHeight}`}>
    {show && <div className="neon-loader-in flex w-56 flex-col items-center gap-5">
      <span className="neon-pulse grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground"><VaultIcon size={30} /></span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="neon-fill h-full rounded-full" /></div>
      <p className="text-xs font-medium text-muted-foreground">{label ?? t("Sincronizando con la red…")}</p>
    </div>}
  </div>;
}

/** Fixed-size placeholder that reserves space so content never jumps when data arrives. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`balance-shimmer rounded-2xl ${className}`} />;
}
