import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";

export function BuyUsdc({ className }: { className?: string }) {
  const session = useBovedaSession();
  const [error, setError] = useState<string | null>(null);
  if (!session.authenticated || !session.walletAddress || !session.buyUsdc) return null;
  return <div className={className}>
    <Button onClick={() => { setError(null); session.buyUsdc!().catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); console.error("[BuyUsdc]", e); if (/exit|clos|cancel/i.test(m)) return; setError(`No se pudo abrir la compra: ${m}`); }); }}><CreditCard size={16} />Comprar USDC</Button>
    <p className="mt-2 text-xs text-muted-foreground">Compra con tarjeta o desde un exchange. Los USDC llegan a tu wallet en unos minutos.</p>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
