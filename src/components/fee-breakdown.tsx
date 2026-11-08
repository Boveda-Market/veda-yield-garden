import { useT, useLocale } from "@/lib/i18n";
import { FEE_WALLET, transactionAmounts } from "@/lib/fees";
export function FeeBreakdown({ amount, deposit = false }: { amount: number; deposit?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const fmt = (n: number, d = 2) => n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: 6 });
  const values = transactionAmounts(amount, deposit ? "deposit" : "exit");
  return <div className="space-y-2 text-sm">
    <dl className="space-y-2"><div className="flex justify-between gap-3"><dt>{t("Importe bruto")}</dt><dd>{fmt(values.gross)} {t("créditos")}</dd></div><div className="flex justify-between gap-3"><dt>{t("Cargo ficticio ·")} {deposit ? t("0% entrada") : t("1% salida")}</dt><dd>{fmt(values.fee)} {t("créditos")}</dd></div><div className="flex justify-between gap-3 font-semibold text-primary"><dt>{deposit ? t("Capital ficticio a invertir") : t("Créditos a recibir")}</dt><dd>{fmt(values.net)} {t("créditos")}</dd></div></dl>
    <p className="pt-2 text-xs text-muted-foreground">{t("Operación y mantenimiento · Destinataria prevista:")}</p><p className="break-all font-mono text-xs text-muted-foreground">{FEE_WALLET}</p>
    <p className="text-xs text-muted-foreground">{t("Prueba: créditos sin valor monetario; no se envían fondos ni cargos reales.")}</p>
  </div>;
}