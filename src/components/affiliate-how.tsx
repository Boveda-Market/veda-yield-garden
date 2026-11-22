import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const ROWS: [string, string, string, string][] = [
  ["$100 USDC", "$1.00", "$0.50 USDC", "$0.10 USDC"],
  ["$500 USDC", "$5.00", "$2.50 USDC", "$0.50 USDC"],
  ["$1,000 USDC", "$10.00", "$5.00 USDC", "$1.00 USDC"],
];

/** Plain-language affiliate explainer, same style as the vault and Up/Down guides. */
export function AffiliateHow() {
  const t = useT();
  const steps: [string, string][] = [
    [t("Comparte tu enlace"), t("Copias tu enlace y se lo envías a un amigo.")],
    [t("Tu amigo usa Bóveda Market"), t("Deposita en bóvedas, juega en Sube/Baja o retira dinero. A él no le cuesta ni un centavo extra.")],
    [t("Tú ganas la mitad de las ganancias"), t("Cada vez que hace un movimiento, Bóveda Market te da el 50% de esas ganancias en USDC.")],
  ];
  const faqs: [string, string][] = [
    [t("¿En qué operaciones gano?"), t("En depósitos, cosechas, cierres de bóveda, retiros y ganancias cobradas en Sube/Baja. Los cambios entre monedas y los envíos son gratis.")],
    [t("¿Cuánto le cuesta a mi invitado?"), t("Nada adicional. Paga la tarifa normal del app.")],
    [t("¿Cómo y cuándo cobro?"), t("Al acumular 3 USDC o más, tocas «Cobrar ganancias» y el dinero llega a tu wallet en USDC.")],
  ];
  return <Dialog>
    <DialogTrigger className="flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"><HelpCircle size={14} />{t("¿Cómo funciona?")}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("¿Cómo funciona Invita y gana?")}</DialogTitle><DialogDescription>{t("Tú te llevas la mitad de lo que cobra Bóveda Market.")}</DialogDescription></DialogHeader>
      <ol className="space-y-3">{steps.map(([h, d], i) => <li key={h} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span><div><p className="font-semibold text-foreground">{h}</p><p className="text-sm leading-6 text-foreground/80">{d}</p></div></li>)}</ol>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted text-muted-foreground"><tr><th className="p-2 text-left">{t("Si tu invitado mueve…")}</th><th className="p-2">{t("Bóveda Market cobra")}</th><th className="p-2 text-primary">{t("Tú recibes")}</th><th className="p-2">{t("Nivel 2")}</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-border"><td className="p-2 font-semibold">{r[0]}</td><td className="p-2 text-center">{r[1]}</td><td className="p-2 text-center font-bold text-primary">{r[2]}</td><td className="p-2 text-center">{r[3]}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("Nivel 2: si tu amigo invita a otra persona, tú también recibes el 10% de lo que cobra Bóveda Market a esa persona.")}</p>
      <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">{faqs.map(([q, a]) => <div key={q}><p className="font-semibold">{q}</p><p className="text-foreground/80">{a}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">{t("¿Quieres los detalles legales completos?")} <Link to="/terminos" hash="afiliados" className="font-medium text-primary underline">{t("Términos y condiciones")}</Link></p>
    </DialogContent>
  </Dialog>;
}
