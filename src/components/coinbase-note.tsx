import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Coinbase brand mark (official blue circle with white "C"). */
export function CoinbaseLogo({ size = 20, className }: { size?: number; className?: string }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={cn("shrink-0", className)}>
    <circle cx="12" cy="12" r="12" fill="#0052FF" />
    <path d="M16.9 9.6A5.6 5.6 0 1 0 16.9 14.4" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
  </svg>;
}

/** Coinbase wordmark (brand blue, lowercase bold). */
export function CoinbaseWordmark() {
  return <span aria-label="Coinbase" className="inline-block align-baseline font-sans text-[1.15em] font-extrabold tracking-tight" style={{ color: "#0052FF" }}>coinbase</span>;
}

/** Sign-in sheet line: enter with Google and top up with Coinbase. */
export function CoinbaseNote({ className }: { className?: string }) {
  const t = useT();
  return <span className={cn("block text-sm", className)}>
    {t("Entra con Google en 1 segundo y recarga con")} <CoinbaseWordmark /> {t("usando tu tarjeta. Sin contraseñas.")}
  </span>;
}
