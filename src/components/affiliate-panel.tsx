import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Copy, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_SHARE_BPS, SUB_AFFILIATE_SHARE_BPS, PAYOUT_MIN_MICRO, payoutProgress, REF_STORAGE_KEY, normalizeCode, type AffiliateDashboard } from "@/lib/affiliate";
import { cancelAffiliateClaim, finalizeAffiliateClaim, claimAffiliatePayout, customizeAffiliateCode, getAffiliateDashboard, joinAffiliate, savePayoutWallet } from "@/lib/affiliate.functions";

const usdc = (raw: string) => (Number(raw) / 1e6).toLocaleString("en-US", { useGrouping: false,  minimumFractionDigits: 2, maximumFractionDigits: 6 });
const field = "mt-2 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AffiliatePanel() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const join = useServerFn(joinAffiliate);
  const saveCode = useServerFn(customizeAffiliateCode);
  const savePayout = useServerFn(savePayoutWallet);
  const claim = useServerFn(claimAffiliatePayout);
  const finalize = useServerFn(finalizeAffiliateClaim);
  const cancel = useServerFn(cancelAffiliateClaim);
  async function collect(): Promise<{ success: boolean; error?: string }> {
    if (!dash?.payoutWallet || session.walletAddress !== dash.payoutWallet) return { success: false, error: "Conecta la wallet donde cobras tus comisiones para firmar el cobro." };
    const prepared = await claim({ data: { token: await token() } });
    if (!prepared.success) return prepared;
    let signature: string;
    try { signature = await session.signAndSend(Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0))); }
    catch (e) { try { await cancel({ data: { token: await token() } }); } catch { /* lock expires */ } return { success: false, error: e instanceof Error ? e.message : "No se pudo firmar." }; }
    return finalize({ data: { token: await token(), signature } });
  }
  const [dash, setDash] = useState<AffiliateDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  async function token() { const value = await session.getAccessToken?.(); if (!value) throw new Error(); return value; }
  async function refresh() {
    try {
      const result = await load({ data: { token: await token() } });
      if (result.success) {
        // Default payout destination: the connected wallet, saved once so payouts have an address.
        if (!result.dashboard.payoutWallet && session.walletAddress) {
          try { const saved = await savePayout({ data: { token: await token(), wallet: session.walletAddress } }); if (saved.success) result.dashboard.payoutWallet = session.walletAddress; } catch { /* keep UI default */ }
        }
        setDash(result.dashboard); setCustomCode(result.dashboard.code); setPayout(result.dashboard.payoutWallet ?? session.walletAddress ?? ""); } else setMessage(t(result.error));
    } catch { setMessage(t("Inicia sesión para ver tu programa de afiliados.")); }
  }
  async function act(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    if (busy) return; setBusy(true); setMessage(null);
    try { const r = await fn(); setMessage(r.success ? t(ok) : t(r.error ?? "No se pudo completar.")); if (r.success) await refresh(); }
    catch { setMessage(t("No se pudo completar.")); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!session.authenticated) return;
    void (async () => {
      const stored = normalizeCode(localStorage.getItem(REF_STORAGE_KEY));
      if (stored) { try { await join({ data: { token: await token(), code: stored } }); } catch { /* ignore */ } localStorage.removeItem(REF_STORAGE_KEY); }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.authenticated]);

  const preview = !session.authenticated;
  if (preview && !dash) { setDash({ code: "EJEMPLO", shareBps: AFFILIATE_SHARE_BPS, referred: 3, subReferred: 2, pendingRaw: "1250000", paidRaw: "0", payoutWallet: null, joinedCode: false, earnings: [] }); setCustomCode("EJEMPLO"); }
  const link = dash ? `${window.location.origin}/?ref=${dash.code}` : "";
  return <section className="mt-10 border-t border-border pt-8" aria-labelledby="affiliate-title">
    <h2 id="affiliate-title" className="flex items-center gap-2 font-display text-2xl font-semibold"><Users size={20} />{t("Invita y gana")}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Comparte tu enlace con amigos y familia. Cada vez que alguien que invitaste deposita, cosecha ganancias o cierra una bóveda, recibes una parte de la comisión que cobra BÓVEDA, sin que a ellos les cueste nada extra.")}</p>
    {preview && <p className="mt-3 rounded-lg border border-border p-3 text-xs text-muted-foreground">{t("Vista de ejemplo: crea una cuenta para obtener tu código real.")}</p>}
    {!dash ? <p className="mt-4 text-sm text-muted-foreground">{message ?? t("Cargando…")}</p> : <>
      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("Tu comisión")}</p>
        <p className="font-semibold">{dash.shareBps / 100}% {t("de la comisión")}{dash.shareBps > AFFILIATE_SHARE_BPS && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{t("Socio VIP")}</span>}</p>
        <p className="mt-3 text-xs text-muted-foreground">{t("Tu código")}</p>
        <p className="font-mono text-lg font-semibold">{dash.code}</p>
        <div className="mt-3 flex gap-2"><input readOnly value={link} aria-label={t("Tu enlace")} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs" /><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(link); setMessage(t("Enlace copiado.")); }}><Copy size={14} />{t("Copiar")}</Button></div>
      </div>
      <form className="mt-4" onSubmit={(e) => { e.preventDefault(); const value = normalizeCode(customCode); if (!value) { setMessage(t("Usa de 4 a 16 letras o números, sin espacios.")); return; } if (preview) { setDash({ ...dash, code: value }); setMessage(t("Enlace de ejemplo actualizado. Inicia sesión para guardar el tuyo.")); return; } void act(async () => saveCode({ data: { token: await token(), code: value } }), "Tu enlace se actualizó."); }}>
        <label className="block text-sm">{t("Personaliza tu enlace")}<input value={customCode} minLength={4} maxLength={16} required onChange={(e) => setCustomCode(e.target.value)} className={field} /></label>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Usa de 4 a 16 letras o números, sin espacios.")} {t("Tus invitados actuales se mantienen. Al cambiar el código, comparte el nuevo enlace: el anterior deja de funcionar.")}</p>
        <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={busy}><Save size={14} />{t("Guardar enlace")}</Button>
      </form>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Invitados")}</dt><dd className="font-semibold">{dash.referred}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Red secundaria")} ({SUB_AFFILIATE_SHARE_BPS / 100}%)</dt><dd className="font-semibold">{dash.subReferred}</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Por cobrar")}</dt><dd className="font-semibold">{usdc(dash.pendingRaw)} USDC</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Pagado")}</dt><dd className="font-semibold">{usdc(dash.paidRaw)} USDC</dd></div>
      </dl>
      {(() => { const p = payoutProgress(BigInt(dash.pendingRaw)); return <div className="mt-4 rounded-xl border border-border p-4">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{t("Próximo pago")}</span><span className="font-semibold text-foreground">{usdc(dash.pendingRaw)} / {usdc(PAYOUT_MIN_MICRO.toString())} USDC</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.pct}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{p.ready ? t("¡Listo! Ya puedes cobrar tus comisiones.") : `${t("Te faltan")} ${usdc(p.missingRaw.toString())} USDC ${t("para tu próximo pago.")}`}</p>
        {p.ready && !preview && <div className="mt-3">
          <p className="text-xs text-muted-foreground">{t("Recibes")} <span className="font-semibold text-foreground">{usdc(dash.pendingRaw)} USDC</span> · {t("la tarifa de red la pagas con tu SOL (≈0.003 SOL)")}</p>
          <Button className="mt-2 w-full" disabled={busy} onClick={() => void act(collect, "¡Cobro enviado a tu wallet!")}>{busy ? t("Enviando…") : t("Cobrar comisiones")}</Button>
        </div>}
      </div>; })()}
      <p className="mt-4 text-xs text-muted-foreground">{t("Recibes el")} {dash.shareBps / 100}% {t("de las comisiones de tus invitados.")} <Link to="/terminos" hash="afiliados" className="font-medium text-primary underline">{t("Ver cómo funciona")}</Link></p>
      {(() => { const connected = session.walletAddress ?? null; const current = dash.payoutWallet ?? connected; const isConnected = !!current && current === connected; const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`; return <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">{t("Destino de tus comisiones (USDC)")}</p>
        {current ? <p className="mt-2 flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden />{isConnected ? t("Tu wallet conectada") : t("Wallet personalizada")}<span className="font-mono text-xs text-muted-foreground">{short(current)}</span></p> : <p className="mt-2 text-xs text-muted-foreground">{t("Conecta una wallet o escribe una dirección para recibir tus pagos.")}</p>}
        {!editingPayout ? <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setPayout(current ?? ""); setEditingPayout(true); }}>{t("Cambiar wallet de destino")}</Button>
          {!isConnected && connected && !preview && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(async () => savePayout({ data: { token: await token(), wallet: connected } }), "Volviste a tu wallet original.")}>{t("Volver a mi wallet original")}</Button>}
        </div> : <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (preview) { setEditingPayout(false); return; } void act(async () => savePayout({ data: { token: await token(), wallet: payout.trim() } }), "Wallet de cobro guardada.").then(() => setEditingPayout(false)); }}>
          <label className="block text-sm">{t("Wallet donde recibes tus pagos (USDC)")}<input value={payout} maxLength={44} onChange={(e) => setPayout(e.target.value)} className={field} /></label>
          <div className="mt-2 flex gap-2"><Button type="submit" size="sm" disabled={busy}>{t("Guardar wallet de cobro")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditingPayout(false)}>{t("Cancelar")}</Button>{connected && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setPayout(connected); if (preview) { setEditingPayout(false); return; } void act(async () => savePayout({ data: { token: await token(), wallet: connected } }), "Volviste a tu wallet original.").then(() => setEditingPayout(false)); }}>{t("Volver a mi wallet original")}</Button>}</div>
          {connected && <p className="mt-2 text-xs text-muted-foreground">{t("Tu wallet original")}: <span className="font-mono">{short(connected)}</span></p>}
        </form>}
      </div>; })()}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Las comisiones se registran solo cuando la red confirma la operación y se pagan periódicamente en USDC tras revisión, al acumular al menos 10 USDC.")}</p>
      {dash.earnings.length > 0 && <ul className="mt-5 divide-y divide-border text-sm">{dash.earnings.map((e) => <li key={e.signature + e.level} className="flex justify-between gap-3 py-2"><span>{e.kind === "harvest" ? t("Cosecha") : e.kind === "deposit" ? t("Depósito") : t("Cierre")} · {new Date(e.createdAt).toLocaleDateString()}{e.level === 2 && <span className="ml-1 text-xs text-muted-foreground">· {t("Nivel 2")}</span>}</span><span>+{usdc(e.commissionRaw)} USDC · {t(e.status === "paid" ? "Pagado" : e.status === "rejected" ? "Rechazado" : "Por cobrar")}</span></li>)}</ul>}
      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); const c = normalizeCode(code); if (!c) { setMessage(t("Código no válido.")); return; } void act(async () => join({ data: { token: await token(), code: c } }), "Código aplicado. ¡Gracias!"); }}>
        <label className="block text-sm">{dash.joinedCode ? t("¿Tienes un código de socio? Escríbelo aquí") : t("¿Te invitó alguien o tienes un código de socio? Escríbelo")}<input value={code} maxLength={16} onChange={(e) => setCode(e.target.value)} className={field} /></label>
        <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={busy}>{t("Aplicar código")}</Button>
      </form>
    </>}
    {dash && message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
  </section>;
}
