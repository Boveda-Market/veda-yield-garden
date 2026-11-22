import { Link } from "@tanstack/react-router";
import { ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** Shown when someone cancels at «Todo listo»: nothing moved, and it says where the dollars are. */
export function FundsKeptCard({ amountMicro, onDone }: { amountMicro?: bigint | null | undefined; onDone: () => void }) {
  const t = useT();
  const amount = amountMicro != null && amountMicro > 0n ? `$${(Number(amountMicro) / 1e6).toFixed(2)}` : null;
  return <div className="grid gap-4 pt-2 text-center">
    <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={28} aria-hidden /></span>
    <DialogTitle className="font-display text-xl">{t("Cancelado. Tus dólares están seguros")}</DialogTitle>
    <DialogDescription asChild><div className="grid gap-2 text-sm text-muted-foreground">
      <p>{amount ? t("Tus {a} siguen en tu Billetera, listos para usar cuando quieras.", { a: amount }) : t("Tus dólares siguen en tu Billetera, listos para usar cuando quieras.")}</p>
      <p>{t("No se movió dinero y no se cobró nada.")}</p>
    </div></DialogDescription>
    <div className="grid gap-2">
      <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-bold"><Link to="/wallet" onClick={onDone}><Wallet className="mr-1" size={18} aria-hidden />{t("Ver mi Billetera")}</Link></Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onDone}>{t("Entendido")}</Button>
    </div>
  </div>;
}
