import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_SHARE_BPS, REF_STORAGE_KEY, normalizeCode, type AffiliateDashboard } from "@/lib/affiliate";
import { customizeAffiliateCode, getAffiliateDashboard, joinAffiliate, savePayoutWallet } from "@/lib/affiliate.functions";

const usdc = (raw: string) => (Number(raw) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const field = "mt-2 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AffiliatePanel() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const join = useServerFn(joinAffiliate);
  const saveCode = useServerFn(customizeAffiliateCode);
  const savePayout = useServerFn(savePayoutWallet);
  const [dash, setDash] = useState<AffiliateDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);

  async function token() { const value = await session.getAccessToken?.(); if (!value) throw new Error(); return value; }
  async function refresh() {
    try {
      const result = await load({ data: { token: await token() } });
      if (result.success) { setDash(result.dashboard); setCustomCode(result.dashboard.code); setPayout(result.dashboard.payoutWallet ?? session.walletAddress ?? ""); } else setMessage(t(result.error));
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
  if (preview && !dash) { setDash({ code: "EJEMPLO", shareBps: AFFILIATE_SHARE_BPS, referred: 3, pendingRaw: "1250000", paidRaw: "0", payoutWallet: null, joinedCode: false, earnings: [] }); setCustomCode("EJEMPLO"); }
  const link = dash ? `${window.location.origin}/?ref=${dash.code}` : "";
  return <section className="mt-10 border-t border-border pt-8" aria-labelledby="affiliate-title">
    <h2 id="affiliate-title" className="flex items-center gap-2 font-display text-2xl font-semibold"><Users size={20} />{t("Invita y gana")}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Comparte tu enlace con amigos y familia. Cada vez que alguien que invitaste cosecha ganancias o cierra una bóveda, recibes el 60% de la comisión que cobra BÓVEDA, sin que a ellos les cueste nada extra.")}</p>
    {preview && <p className="mt-3 rounded-lg border border-border p-3 text-xs text-muted-foreground">{t("Vista de ejemplo: crea una cuenta para obtener tu código real.")}</p>}
    {!dash ? <p className="mt-4 text-sm text-muted-foreground">{message ?? t("Cargando…")}</p> : <>
      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("Tu comisión")}</p>
        <p className="font-semibold">{dash.shareBps / 100}% {t("de la comisión")}</p>
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
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Por cobrar")}</dt><dd className="font-semibold">{usdc(dash.pendingRaw)} USDC</dd></div>
        <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">{t("Pagado")}</dt><dd className="font-semibold">{usdc(dash.paidRaw)} USDC</dd></div>
      </dl>
      <form className="mt-5" onSubmit={(e) => { e.preventDefault(); void act(async () => savePayout({ data: { token: await token(), wallet: payout.trim() } }), "Wallet de cobro guardada."); }}>
        <label className="block text-sm">{t("Wallet donde recibes tus pagos (USDC)")}<input value={payout} maxLength={44} onChange={(e) => setPayout(e.target.value)} className={field} /></label>
        <Button type="submit" size="sm" className="mt-2" disabled={busy}>{t("Guardar wallet de cobro")}</Button>
      </form>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Las comisiones se registran solo cuando la red confirma la operación y se pagan periódicamente en USDC tras revisión.")}</p>
      {dash.earnings.length > 0 && <ul className="mt-5 divide-y divide-border text-sm">{dash.earnings.map((e) => <li key={e.signature} className="flex justify-between gap-3 py-2"><span>{e.kind === "harvest" ? t("Cosecha") : t("Cierre")} · {new Date(e.createdAt).toLocaleDateString()}</span><span>+{usdc(e.commissionRaw)} USDC · {t(e.status === "paid" ? "Pagado" : e.status === "rejected" ? "Rechazado" : "Por cobrar")}</span></li>)}</ul>}
      {!dash.joinedCode && <form className="mt-6" onSubmit={(e) => { e.preventDefault(); const c = normalizeCode(code); if (!c) { setMessage(t("Código no válido.")); return; } void act(async () => join({ data: { token: await token(), code: c } }), "Código aplicado. ¡Gracias!"); }}>
        <label className="block text-sm">{t("¿Te invitó alguien? Escribe su código")}<input value={code} maxLength={16} onChange={(e) => setCode(e.target.value)} className={field} /></label>
        <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={busy}>{t("Aplicar código")}</Button>
      </form>}
    </>}
    {dash && message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
  </section>;
}
