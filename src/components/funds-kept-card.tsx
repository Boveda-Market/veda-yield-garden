import { Link } from "@tanstack/react-router";
import { ShieldCheck, Wallet, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** Where the money stays after a cancelled operation. */
export type KeptWhere = "wallet" | "vault" | "earnings" | "prediction" | "prize";

const COPY: Record<KeptWhere, { body: string; to: "/wallet" | "/portfolio"; cta: string }> = {
  wallet: { body: "Tus dólares siguen en tu Billetera, listos para usar cuando quieras.", to: "/wallet", cta: "Ver mi Billetera" },
  vault: { body: "Tu dinero sigue trabajando en tu bóveda. Lo ves en Mi Portafolio.", to: "/portfolio", cta: "Ver Mi Portafolio" },
  earnings: { body: "Tus ganancias siguen acumulándose en tu bóveda. Puedes cosecharlas cuando quieras desde Mi Portafolio.", to: "/portfolio", cta: "Ver Mi Portafolio" },
  prediction: { body: "Tu predicción sigue activa. La ves en Mi Portafolio.", to: "/portfolio", cta: "Ver Mi Portafolio" },
  prize: { body: "Tu premio sigue esperando. Lo cobras cuando quieras desde tu Billetera.", to: "/wallet", cta: "Ver mi Billetera" },
};

/** Shared card for every cancelled money operation: nothing moved, nothing charged, and where the money is. */
export function FundsKeptCard({ where = "wallet", amountMicro, onDone }: { where?: KeptWhere; amountMicro?: bigint | null | undefined; onDone: () => void }) {
  const t = useT();
  const c = COPY[where];
  const amount = where === "wallet" && amountMicro != null && amountMicro > 0n ? `$${(Number(amountMicro) / 1e6).toFixed(2)}` : null;
  const Icon = c.to === "/wallet" ? Wallet : PieChart;
  return <div className="grid gap-4 pt-2 text-center">
    <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={28} aria-hidden /></span>
    <DialogTitle className="px-8 font-display text-xl">{where === "wallet" ? t("Cancelado. Tus dólares están seguros") : t("Cancelado. Todo sigue igual")}</DialogTitle>
    <DialogDescription asChild><div className="grid gap-2 text-sm text-muted-foreground">
      <p>{amount ? t("Tus {a} siguen en tu Billetera, listos para usar cuando quieras.", { a: amount }) : t(c.body)}</p>
      <p>{t("No se movió dinero y no se cobró nada.")}</p>
    </div></DialogDescription>
    <div className="grid gap-2">
      <Button asChild size="lg" className="h-12 w-full rounded-xl text-base font-bold"><Link to={c.to} onClick={onDone}><Icon className="mr-1" size={18} aria-hidden />{t(c.cta)}</Link></Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onDone}>{t("Entendido")}</Button>
    </div>
  </div>;
}
