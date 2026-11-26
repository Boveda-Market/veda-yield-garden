import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useI18n } from "@/lib/i18n";
import { guideHref } from "@/components/guide-layout";
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
export function CoinbaseNote({ className, compact }: { className?: string; compact?: boolean }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const brand = <a href="https://www.coinbase.com" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Coinbase" className="inline-flex align-middle hover:opacity-80"><CoinbaseWordmark /></a>;
  const mark = <a href="https://www.coinbase.com" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Coinbase" className="inline-flex align-middle hover:opacity-80"><CoinbaseLogo size={14} /></a>;
  const more = <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className="whitespace-nowrap font-medium text-primary underline underline-offset-2">{t("Más información")}</button>;
  return <span className={cn("block text-sm", className)}>
    {compact ? <>{t("Puedes recargar con Apple Pay, tarjeta o")} {mark} <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className="whitespace-nowrap font-medium text-primary underline underline-offset-2">{t("Más info")}</button></> : <>{t("Entra con tu cuenta de Google en 1 segundo y recarga con")} {brand} {t("usando tu tarjeta. Sin contraseñas.")} {more}</>}
    <Dialog open={open} onOpenChange={setOpen}><ActionSheetContent closeLabel={t("Cerrar")}>
      <DialogTitle className="flex items-center gap-2">{t("Así recargas con")} <a href="https://www.coinbase.com" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Coinbase" className="inline-flex align-middle hover:opacity-80"><CoinbaseWordmark /></a></DialogTitle>
      <DialogDescription className="sr-only">{t("Tres pasos para entrar y recargar dólares.")}</DialogDescription>
      <ol className="grid gap-3 text-sm">
        {[["🔐", t("Entra con Google en segundos"), t("Tu billetera protegida se crea al instante, sin contraseñas.")], ["🏦", t("Paga en la página oficial de Coinbase"), t("Con tarjeta, banco o tu saldo de Coinbase. Bóveda Market nunca ve tus datos de pago.")], ["⚡", t("Tus dólares, listos en minutos"), t("Juega Doble o Nada con rondas relámpago de 5 minutos o haz rendir tu dinero. Solo tú puedes moverlo.")]].map(([i, h, d]) => <li key={h} className="flex gap-3 rounded-xl border border-border p-3"><span className="text-xl">{i}</span><span><span className="block font-semibold">{h}</span><span className="text-muted-foreground">{d}</span></span></li>)}
      </ol>
      <p className="text-xs text-muted-foreground">{t("Bóveda Market no cobra por recargar; Coinbase muestra su cargo antes de pagar.")}</p>
      <Link to={guideHref("/guias/recargar-con-coinbase", lang)} target="_blank" className="text-sm font-medium text-primary underline underline-offset-2">{t("Ver la guía completa")}</Link>
    </ActionSheetContent></Dialog>
  </span>;
}
