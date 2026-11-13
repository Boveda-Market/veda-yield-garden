import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import type { PredictPosition } from "@/lib/predict";
import { executePredict, preparePredictSell } from "@/lib/predict.functions";
import { annotateRecord } from "@/lib/predict-history";
import { PredictPositionCard } from "@/components/predict-position-card";

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Open Sube/Baja rounds for the connected wallet, with a direct "Cerrar ahora". */
export function useOpenPredictions() {
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const q = usePredictPositions(wallet);
  const items = (q.data ?? []).filter((p) => p.status === "open");
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["predict-positions", wallet] }); }, [qc, wallet]);
  return { items, refresh, session, wallet };
}

export function OpenPredictions({ state }: { state: ReturnType<typeof useOpenPredictions> }) {
  const t = useT();
  const { items, refresh, session, wallet } = state;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sell = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
      const r = await preparePredictSell({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const signed = await session.signOnly(fromB64(r.transaction));
      const x = await executePredict({ data: { wallet, signed: toB64(signed), context: r.context } });
      if (!x.success) throw new Error(x.error);
      annotateRecord(wallet, p.pubkey, { soldMicro: p.valueMicro ?? "0", sellSig: x.signature });
      setMsg({ ok: true, text: t("Venta confirmada. El USDC está en tu wallet.") });
      setTimeout(() => void refresh(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  if (items.length === 0) return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">{t("No tienes predicciones abiertas ahora mismo.")}</p>;
  return <div className="space-y-3">
    {msg && <p role="status" className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    <div className="grid gap-4 md:grid-cols-2">{items.map((p) => <PredictPositionCard key={p.pubkey} p={p} onSell={() => void sell(p)} selling={busy === p.pubkey} disabled={!!busy} />)}</div>
  </div>;
}

/** Mi Billetera: open Sube/Baja rounds; renders nothing when there are none. */
export function WalletOpenPredictions() {
  const t = useT();
  const state = useOpenPredictions();
  if (state.items.length === 0) return null;
  return <section aria-label={t("Predicciones abiertas")} className="rounded-2xl border border-border bg-card p-4">
    <h3 className="mb-3 font-display text-lg">{t("Predicciones abiertas")}</h3>
    <OpenPredictions state={state} />
  </section>;
}
