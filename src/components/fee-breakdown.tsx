import { FEE_WALLET, transactionAmounts } from "@/lib/fees";
const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
export function FeeBreakdown({ amount, deposit = false }: { amount: number; deposit?: boolean }) {
  const values = transactionAmounts(amount);
  return <div className="space-y-2 text-sm">
    <dl className="space-y-2"><div className="flex justify-between gap-3"><dt>Importe bruto</dt><dd>{fmt(values.gross)} créditos</dd></div><div className="flex justify-between gap-3"><dt>Cargo ficticio · 1%</dt><dd>{fmt(values.fee)} créditos</dd></div><div className="flex justify-between gap-3 font-semibold text-primary"><dt>{deposit ? "Capital ficticio a invertir" : "Créditos a recibir"}</dt><dd>{fmt(values.net)} créditos</dd></div></dl>
    <p className="pt-2 text-xs text-muted-foreground">Operación y mantenimiento · Destinataria prevista:</p><p className="break-all font-mono text-xs text-muted-foreground">{FEE_WALLET}</p>
    <p className="text-xs text-muted-foreground">Prueba: créditos sin valor monetario; no se envían fondos ni cargos reales.</p>
  </div>;
}