import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_TIERS, REF_STORAGE_KEY, normalizeCode, type AffiliateDashboard } from "@/lib/affiliate";
import { applyVip, getAffiliateDashboard, joinAffiliate, savePayoutWallet } from "@/lib/affiliate.functions";

const usdc = (raw: string) => (Number(raw) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const field = "mt-2 w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function AffiliatePanel() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const join = useServerFn(joinAffiliate);
  const apply = useServerFn(applyVip);
  const savePayout = useServerFn(savePayoutWallet);
  const [dash, setDash] = useState<AffiliateDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);

  async function token() { const value = await session.getAccessToken?.(); if (!value) throw new Error(); return value; }
  async function refresh() {
    try {
      const result = await load({ data: { token: await token() } });
      if (result.success) { setDash(result.dashboard); setPayout(result.dashboard.payoutWallet ?? session.walletAddress ?? ""); } else setMessage(t(result.error));
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

  if (!session.authenticated) return null;
  const link = dash ? `${window.location.origin}/?ref=${dash.code}` : "";
  return <section className="mt-10 border-t border-border pt-8" aria-labelledby="affiliate-title">
    <h2 id="affiliate-title" className="flex items-center gap-2 font-display text-2xl font-semibold"><Users size={20} />{t("Invita y gana")}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Comparte tu enlace. Cuando alguien que invitaste cosecha ganancias o cierra una bóveda, recibes una parte de la comisión del 1% que cobra BÓVEDA. A ellos no les cuesta nada extra.")}</p>
    {!dash ? <p className="mt-4 text-sm text-muted-foreground">{message ?? t("Cargando…")}</p> : <>
      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t("Tu nivel")}</p>
        <p className="font-semibold">{t(AFFILIATE_TIERS[dash.tier].label)} · {dash.shareBps / 100}% {t("de la comisión")}</p>
        <p className="mt-3 text-xs text-muted-foreground">{t("Tu código")}</p>
        <p className="font-mono text-lg font-semibold">{dash.code}</p>
        <div className="mt-3 flex gap-2"><input readOnly value={link} aria-label={t("Tu enlace")} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs" /><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(link); setMessage(t("Enlace copiado.")); }}><Copy size={14} />{t("Copiar")}</Button></div>
      </div>
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
      {dash.tier !== "vip" && <div className="mt-6 rounded-xl border border-border p-4">
        <h3 className="flex items-center gap-2 font-semibold"><Star size={16} />{t("¿Eres influencer? Gana 60%")}</h3>
        {dash.application === "pending" ? <p className="mt-2 text-sm text-muted-foreground">{t("Tu solicitud está en revisión.")}</p> : <form onSubmit={(e) => { e.preventDefault(); void act(async () => apply({ data: { token: await token(), channel, audience } }), "Solicitud enviada. Te avisaremos cuando la revisemos."); }}>
          {dash.application === "rejected" && <p className="mt-2 text-sm text-muted-foreground">{t("Tu solicitud anterior no fue aprobada. Puedes enviar otra.")}</p>}
          <label className="mt-3 block text-sm">{t("Tu canal o red social principal")}<input required minLength={3} maxLength={200} value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="youtube.com/@tucanal" className={field} /></label>
          <label className="mt-3 block text-sm">{t("Cuéntanos sobre tu audiencia (opcional)")}<textarea maxLength={500} value={audience} onChange={(e) => setAudience(e.target.value)} className={field} /></label>
          <Button type="submit" size="sm" className="mt-3" disabled={busy}>{t("Solicitar nivel VIP")}</Button>
        </form>}
      </div>}
      {!dash.joinedCode && <form className="mt-6" onSubmit={(e) => { e.preventDefault(); const c = normalizeCode(code); if (!c) { setMessage(t("Código no válido.")); return; } void act(async () => join({ data: { token: await token(), code: c } }), "Código aplicado. ¡Gracias!"); }}>
        <label className="block text-sm">{t("¿Te invitó alguien? Escribe su código")}<input value={code} maxLength={16} onChange={(e) => setCode(e.target.value)} className={field} /></label>
        <Button type="submit" size="sm" variant="outline" className="mt-2" disabled={busy}>{t("Aplicar código")}</Button>
      </form>}
    </>}
    {dash && message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
  </section>;
}
