import { useT, useLocale } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { getWalletActivity } from "@/lib/wallet-activity.functions";
import type { TrialActivity } from "@/lib/trial-activity";
import { VAULTS } from "@/lib/vaults";

export function ActivityView({ trial, wallet, rows, heading = "Tu actividad" }: { trial: boolean; wallet: string | null; rows: TrialActivity[]; heading?: string }) {
  const t = useT();
  const locale = useLocale();
  const read = useServerFn(getWalletActivity);
  const query = useQuery({ queryKey: ["wallet-activity", wallet], queryFn: () => { if (!wallet) throw new Error(); return read({ data: { wallet } }); }, enabled: !trial && Boolean(wallet), staleTime: 30000, retry: false });
  return <section className="py-8"><div className="flex items-center justify-between"><h1 className="font-display text-3xl font-semibold">{t(heading)}</h1>{!trial && <Button variant="outline" size="icon" aria-label={t("Actualizar actividad")} disabled={!wallet || query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={18} /></Button>}</div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{trial ? t("Tus movimientos de Prueba. Son ficticios y se guardan en este navegador; no aparecen en la red.") : t("Las 20 transacciones más recientes que incluyen tu dirección. Pueden incluir movimientos fuera de BÓVEDA; no es un historial completo de todos tus tokens.")}</p>
    {trial ? <div className="mt-6">{rows.length === 0 ? <p className="border-y border-border py-8 text-muted-foreground">{t("Aún no tienes movimientos guardados. Los movimientos de Prueba anteriores a esta vista no se recuperan.")}</p> : rows.map((row) => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-5"><div><p className="font-semibold">{row.kind === "deposit" ? t("Depósito") : row.kind === "harvest" ? t("Cosecha de ganancias") : t("Cierre y liquidación")} · {t(VAULTS.find((v) => v.id === row.vaultId)?.name ?? "")}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(row.at).toLocaleString(locale)} {t("· Completado en Prueba")}</p></div><div className="text-right text-sm"><p>{row.net.toLocaleString(locale, { maximumFractionDigits: 6 })} {t("créditos netos")}</p><p className="text-xs text-muted-foreground">{t("Bruto")} {row.gross} {t("· cargo ficticio")} {row.fee}</p></div></article>)}</div> : <div className="mt-6">
      {!wallet && <p className="py-6 text-muted-foreground">{t("Conecta tu wallet para consultar sus movimientos.")}</p>}
      {query.isFetching && <p role="status">{t("Consultando la red…")}</p>}
      {query.isError && <p role="alert" className="text-destructive">{t("No se pudo consultar la actividad.")}</p>}
      {query.data && !query.data.success && <p role="alert" className="text-destructive">{t(query.data.error)}</p>}
      {query.data?.success && (query.data.rows.length ? query.data.rows.map((row) => <article key={row.signature} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5"><div><p className="text-sm font-semibold">{t("Transacción ·")} {row.failed ? t("Fallida") : row.status === "finalized" ? t("Finalizada") : t("Confirmada")}</p><p className="mt-1 text-xs text-muted-foreground">{row.at ? new Date(row.at).toLocaleString(locale) : t("Fecha no disponible")}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{row.signature.slice(0, 12)}…{row.signature.slice(-8)}</p></div><Button asChild variant="outline" size="sm"><a href={`https://solscan.io/tx/${row.signature}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}<ExternalLink size={14} /></a></Button></article>) : <p className="py-6 text-muted-foreground">{t("No se encontraron transacciones recientes para esta dirección.")}</p>)}
    </div>}
  </section>;
}