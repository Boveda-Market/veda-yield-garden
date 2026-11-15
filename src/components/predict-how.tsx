import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

/** The four steps to play one round, shared by the dialog and the inline guide. */
export function PredictSteps() {
  const t = useT();
  const steps: [string, string][] = [
    [t("Escoge el activo y el tiempo"), t("Elige BTC, ETH o SOL y la duración de la ronda: 5 min, 15 min o 4 horas.")],
    [t("Selecciona quién va a ganar"), t("Toca Sube o Baja según creas que el precio terminará por encima o por debajo del precio a batir.")],
    [t("Confirma la transacción"), t("Revisa la cotización en dólares y firma con tu cuenta.")],
    [t("Espera o cierra la pantalla"), t("La ronda se resuelve sola. Te llegará una notificación en la campanita (y en Telegram si lo conectaste) para reclamar tu premio si ganas.")],
  ];
  return (
    <ol className="space-y-3">
      {steps.map(([h, d], i) => (
        <li key={h} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
          <div><p className="text-sm font-semibold">{h}</p><p className="text-sm text-muted-foreground">{d}</p></div>
        </li>
      ))}
    </ol>
  );
}

/** Plain-language explainer: predictions are not crypto purchases. */
export function PredictHow() {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1 self-start rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
        <HelpCircle size={14} />{t("¿Cómo funciona?")}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("¿Cómo funcionan las predicciones?")}</DialogTitle>
          <DialogDescription>{t("Acierta el movimiento y cobra en minutos.")}</DialogDescription>
        </DialogHeader>
        <PredictSteps />
        <p className="text-sm text-muted-foreground">{t("No compras la moneda: juegas y cobras en dólares. Nunca pierdes más de lo que pusiste, y puedes vender antes del cierre al precio del momento.")}</p>
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          <p className="font-semibold">{t("Ejemplo con $5")}</p>
          <p className="text-muted-foreground">{t("Crees que Bitcoin sube en 5 minutos. «Sube» cuesta 0.50, así que $5 compran 10 contratos. Si al final el precio está más alto, cobras $10.00. Si está más bajo, pierdes los $5.")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("Los precios cambian según lo que opinan otros participantes. BÓVEDA nunca juega en tu contra.")}</p>
      </DialogContent>
    </Dialog>
  );
}
