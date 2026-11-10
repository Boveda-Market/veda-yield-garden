import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** Plain-language explainer: predictions are not crypto purchases. */
export function PredictHow() {
  const t = useT();
  const points: [string, string][] = [
    [t("No compras cripto"), t("No compras Bitcoin, ETH ni SOL. Tu dinero sigue en USDC: solo predices si el precio subirá o bajará durante el tiempo de la ronda.")],
    [t("Tiempo definido"), t("Cada ronda dura 5 minutos, 15 minutos o un día. Al terminar, se compara el precio final con el precio de inicio.")],
    [t("Cómo ganas"), t("Cada contrato ganador paga 1.00 USDC. Si lo compraste a 0.55 y aciertas, ganas 0.45 por contrato.")],
    [t("Riesgo claro"), t("Nunca pierdes más de lo que pusiste. Si no aciertas, el contrato vence sin valor. Sin préstamos ni liquidaciones.")],
  ];
  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1 self-start rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
        <HelpCircle size={14} />{t("¿Cómo funciona?")}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("¿Cómo funcionan las predicciones?")}</DialogTitle>
          <DialogDescription>{t("Predices el precio, no compras la moneda.")}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {points.map(([h, d], i) => (
            <li key={h} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <div><p className="text-sm font-semibold">{h}</p><p className="text-sm text-muted-foreground">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          <p className="font-semibold">{t("Ejemplo con 5 USDC")}</p>
          <p className="text-muted-foreground">{t("Crees que Bitcoin sube en 5 minutos. «Sube» cuesta 0.50, así que 5 USDC compran 10 contratos. Si al final el precio está más alto, cobras 10.00 USDC. Si está más bajo, pierdes los 5 USDC.")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("Los precios cambian según lo que opinan otros participantes. BÓVEDA nunca juega en tu contra.")}</p>
      </DialogContent>
    </Dialog>
  );
}
