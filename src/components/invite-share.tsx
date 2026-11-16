import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Share2, ChevronRight, MessageCircle, Send, Copy, Check, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getAffiliateDashboard } from "@/lib/affiliate.functions";

export const shareText = (t: (s: string) => string) => t("Oye, estoy usando BÓVEDA para poner mis dólares a rendir y jugar Doble o Nada. Entra con mi enlace:");

/** One-tap share buttons (native sheet, WhatsApp, Telegram) for a referral link. */
export function ShareButtons({ link, onCopied }: { link: string; onCopied?: () => void }) {
  const t = useT();
  const text = shareText(t);
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "BÓVEDA", text, url: link }); } catch { /* cancelled */ } return; }
    await navigator.clipboard.writeText(`${text} ${link}`); onCopied?.();
  }
  const enc = encodeURIComponent;
  return <div className="flex flex-wrap gap-2">
    <Button size="sm" onClick={() => void share()}><Share2 size={14} />{t("Compartir")}</Button>
    <Button size="sm" variant="outline" asChild><a href={`https://wa.me/?text=${enc(`${text} ${link}`)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} />WhatsApp</a></Button>
    <Button size="sm" variant="outline" asChild><a href={`https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer"><Send size={14} />Telegram</a></Button>
  </div>;
}

/** Highlighted "Invite and earn" card for Mi Billetera. */
export function InvitePromoCard() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAffiliateDashboard);
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!session.authenticated) return;
    void (async () => { try { const token = await session.getAccessToken?.(); if (!token) return; const r = await load({ data: { token } }); if (r.success) { setCode(r.dashboard.code); setPending((Number(r.dashboard.pendingRaw) / 1e6).toFixed(2)); } } catch { /* optional card */ } })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.authenticated]);
  const link = code ? `${window.location.origin}/?ref=${code}` : "";
  return <section aria-label={t("Invita y gana")} className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Gift size={22} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold">{t("Gana más compartiendo BÓVEDA")}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("Llévate el 50% de las comisiones de tus invitados, en USDC directo a tu wallet. A ellos no les cuesta nada extra.")}</p>
      </div>
    </div>
    {code && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="text-muted-foreground">{t("Tu código")}: <span className="font-mono font-semibold text-foreground">{code}</span></span>{pending && <span className="text-muted-foreground">{t("Por cobrar")}: <span className="font-semibold text-foreground">{pending} USDC</span></span>}</div>}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {link && <ShareButtons link={link} onCopied={() => setCopied(true)} />}
      <Button size="sm" variant="ghost" asChild><Link to="/invita">{t("Ver mi panel")}<ChevronRight size={14} /></Link></Button>
    </div>
    {copied && <p role="status" className="mt-2 text-xs text-muted-foreground">{t("Enlace copiado.")}</p>}
  </section>;
}

/** Modern "Invita y Gana" hero: 3 steps + one-tap copy/share, first thing on /invita. */
export function InviteHero({ link, code, referred, pending, preview, onCopied }: { link: string; code: string; referred: number; pending: string; preview: boolean; onCopied?: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const text = shareText(t);
  const enc = encodeURIComponent;
  async function copy() { try { await navigator.clipboard.writeText(link); } catch { /* ignore */ } setCopied(true); onCopied?.(); setTimeout(() => setCopied(false), 2000); }
  async function share() { if (navigator.share) { try { await navigator.share({ title: "BÓVEDA", text, url: link }); } catch { /* cancelled */ } return; } await copy(); }
  const steps: [string, string][] = [[t("Copia tu enlace"), t("Ya está listo. Un toque y es tuyo.")], [t("Compártelo"), t("Con amigos y familia, por WhatsApp o Telegram.")], [t("Gana hasta 60%"), t("De la comisión de cada movimiento, en dólares.")]];
  return <section aria-labelledby="invite-hero" className="invite-ring rounded-3xl p-[2px]">
    <div className="rounded-[22px] bg-[image:var(--gradient-invite-surface)] p-5 text-invite-foreground sm:p-7">
      <span className="invite-cta inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-invite-surface"><Gift size={12} aria-hidden />{t("Invita y Gana")}</span>
      <h1 id="invite-hero" className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{t("Comparte BÓVEDA y gana")} <span className="bg-[image:linear-gradient(90deg,var(--invite),var(--invite-2))] bg-clip-text text-transparent">{t("hasta 60%")}</span></h1>
      <p className="mt-2 text-sm text-invite-muted">{t("A tus invitados no les cuesta nada extra.")}</p>
      <ol className="mt-5 grid grid-cols-3 gap-2">{steps.map(([h, d], i) => <li key={h} className="rounded-2xl border border-invite/25 bg-invite-foreground/5 p-3">
        <span className="invite-cta grid h-8 w-8 place-items-center rounded-full font-display text-sm font-black text-invite-surface">{i + 1}</span>
        <p className="mt-2 text-sm font-bold leading-tight">{h}</p>
        <p className="mt-1 text-[11px] leading-4 text-invite-muted">{d}</p>
      </li>)}</ol>
      <div className="mt-5 rounded-2xl border border-invite/30 bg-invite-surface/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-invite-muted">{t("Tu enlace")} · <span className="font-mono normal-case text-invite">{code}</span></p>
        <p className="mt-1 truncate font-mono text-sm">{link.replace(/^https?:\/\//, "")}</p>
        <button type="button" onClick={() => void copy()} className="invite-cta mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-extrabold text-invite-surface transition-transform active:scale-[0.98]">{copied ? <><Check size={20} />{t("¡Copiado!")}</> : <><Copy size={20} />{t("Copiar mi enlace")}</>}</button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <a href={`https://wa.me/?text=${enc(`${text} ${link}`)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-invite/40 text-sm font-bold hover:bg-invite/10"><MessageCircle size={16} />WhatsApp</a>
          <a href={`https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-invite/40 text-sm font-bold hover:bg-invite/10"><Send size={16} />Telegram</a>
          <button type="button" onClick={() => void share()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-invite/40 text-sm font-bold hover:bg-invite/10"><Share2 size={16} />{t("Más")}</button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-invite-foreground/5 p-3"><dt className="flex items-center gap-1 text-[11px] text-invite-muted"><Users size={12} />{t("Invitados")}</dt><dd className="font-display text-2xl font-extrabold">{referred}</dd></div>
        <div className="rounded-2xl bg-invite-foreground/5 p-3"><dt className="flex items-center gap-1 text-[11px] text-invite-muted"><Wallet size={12} />{t("Ganado por cobrar")}</dt><dd className="font-display text-2xl font-extrabold text-invite">${pending}</dd></div>
      </dl>
      {preview && <p className="mt-3 text-center text-xs text-invite-muted">{t("Vista de ejemplo: inicia sesión para obtener tu enlace real.")}</p>}
    </div>
  </section>;
}
