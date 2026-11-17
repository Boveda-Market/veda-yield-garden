import { HelpCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** High-contrast 3-step guide plus a simple "how it works" dialog for vaults. */
export function VaultSteps({ className = "" }: { className?: string }) {
  const t = useT();
  const steps = [t("Elige tu bóveda: SOL o MET"), t("Deposita tus USDC, desde 1 USDC"), t("¡Cosecha ganancias o retira cuando quieras!")];
  const points = [
    [t("Tu dinero trabaja"), t("Tus USDC se suman a una bóveda donde otras personas cambian monedas.")],
    [t("Ganas intereses"), t("Cada cambio paga una comisión y recibes tu parte proporcional.")],
    [t("Cosechar o liquidar"), t("Cosechar cobra solo tus ganancias y tu depósito sigue trabajando. Liquidar retira tu dinero a USDC.")],
    [t("Tú tienes el control"), t("Sin plazos de permanencia. Revisas y firmas cada operación. Las ganancias no están garantizadas y puedes perder dinero.")],
  ];
  return <div className={`space-y-3 ${className}`}>
    <ol className="grid gap-2 sm:grid-cols-3" aria-label={t("Cómo empezar")}>
      {steps.map((s, i) => <li key={s} className="flex items-center gap-3 rounded-xl border-2 border-primary/50 bg-primary/15 p-3 text-sm font-bold text-foreground"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow">{i + 1}</span>{s}</li>)}
    </ol>
    <Dialog>
      <DialogTrigger className="flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"><HelpCircle size={14} />{t("¿Cómo funcionan las bóvedas?")}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("¿Cómo funcionan las bóvedas?")}</DialogTitle><DialogDescription>{t("Pon tus USDC a trabajar y recibe intereses.")}</DialogDescription></DialogHeader>
        <ol className="space-y-3">{points.map(([h, d], i) => <li key={h} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span><div><p className="font-semibold text-foreground">{h}</p><p className="text-sm leading-6 text-foreground/80">{d}</p></div></li>)}</ol>
      </DialogContent>
    </Dialog>
  </div>;
}
