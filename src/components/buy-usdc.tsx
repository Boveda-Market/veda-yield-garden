import { useT } from "@/lib/i18n";
import { useState } from "react";
import { CreditCard, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { QuickSwapButton } from "@/components/quick-swap";

/** Card/exchange purchase buttons for USDC and SOL. */
export function BuyUsdc({ className, only }: { className?: string; only?: "SOL" | "USDC" }) {
  const t = useT();
  const session = useBovedaSession();
  const [error, setError] = useState<string | null>(null);
  if (!session.authenticated || !session.walletAddress) return null;
  const open = (fn?: () => Promise<void>) => { if (!fn) return; setError(null); fn().catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); console.error("[BuyFunds]", e); if (/exit|clos|cancel/i.test(m)) return; setError(t("No se pudo abrir la compra: {message}", { message: t(m) })); }); };
  return <div className={className}>
    <div className="flex flex-wrap gap-2">
      {only !== "SOL" && session.buyUsdc && <Button onClick={() => open(session.buyUsdc)}><CreditCard size={16} />{t("Comprar USDC")}</Button>}
      {only !== "USDC" && session.buySol && <Button variant={only === "SOL" ? "default" : "outline"} onClick={() => open(session.buySol)}><Fuel size={16} />{t("Comprar SOL")}</Button>}
      {!only && <QuickSwapButton />}
    </div>
    {!only && <p className="mt-2 text-xs text-muted-foreground">{t("Compra con tarjeta o desde un exchange. Llegan a tu wallet en unos minutos. El SOL paga los costos de red; los USDC son lo que pones a trabajar.")}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
