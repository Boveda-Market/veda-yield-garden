import { useState, type ReactNode } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const ROWS: [string, string][] = [
  ["Guardan tu dinero en sus propias cuentas.", "Tu dinero está siempre en tu propia wallet. Solo tú tienes la llave."],
  ["Necesitas su aprobación para retirar y pueden congelar retiros.", "Retiras cuando quieras, sin pedir permiso a nadie."],
  ["Prometen rendimientos fijos que no explican.", "Las ganancias vienen de comisiones reales y verificables; nunca garantizadas."],
  ["Si la empresa cae, tu dinero cae con ella.", "BÓVEDA nunca toca tu dinero: no puede perderlo ni bloquearlo."],
];

export function SecurityGuarantees() {
  const t = useT();
  return (
    <div className="space-y-3">
      {ROWS.map(([bad, good]) => (
        <div key={good} className="rounded-xl border border-border p-3 text-sm">
          <p className="flex gap-2 text-muted-foreground"><X size={16} className="mt-0.5 shrink-0 text-destructive" />{t(bad)}</p>
          <p className="mt-2 flex gap-2 font-medium"><Check size={16} className="mt-0.5 shrink-0 text-primary" />{t(good)}</p>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{t("Ganamos solo un 1% en operaciones con comisión. Nunca te pediremos tu frase secreta ni tu llave privada.")}</p>
    </div>
  );
}

export function SecurityWhyDialog({ trigger }: { trigger: (open: () => void) => ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2 font-display"><ShieldCheck size={20} className="text-primary" />{t("¿Por qué tus fondos están seguros?")}</DialogTitle>
          <DialogDescription>{t("Otras apps han fallado por guardar el dinero de sus usuarios. BÓVEDA funciona distinto.")}</DialogDescription>
          <SecurityGuarantees />
        </DialogContent>
      </Dialog>
    </>
  );
}
