import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Share2, ChevronRight, Copy, Check, Users, Wallet } from "lucide-react";
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
    <Button size="sm" asChild className="bg-whatsapp text-brand-foreground hover:bg-whatsapp hover:brightness-110"><a href={`https://wa.me/?text=${enc(`${text} ${link}`)}`} target="_blank" rel="noopener noreferrer"><WaLogo />WhatsApp</a></Button>
    <Button size="sm" asChild className="bg-telegram text-brand-foreground hover:bg-telegram hover:brightness-110"><a href={`https://t.me/share/url?url=${enc(link)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer"><TgLogo />Telegram</a></Button>
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


const WaLogo = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>;
const TgLogo = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>;

/** Modern "Invita y Gana" hero: 3 steps + one-tap copy/share, first thing on /invita. */
export function InviteHero({ link, code, referred, pending, preview, onCopied, ready, missing, busy, onClaim }: { link: string; code: string; referred: number; pending: string; preview: boolean; onCopied?: () => void; ready?: boolean; missing?: string; busy?: boolean; onClaim?: () => void }) {
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
        <button type="button" onClick={() => void share()} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-invite/50 text-base font-bold transition-colors hover:bg-invite/10"><Share2 size={18} />{t("Compartir")}</button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-invite-foreground/5 p-3"><dt className="flex items-center gap-1 text-[11px] text-invite-muted"><Users size={12} />{t("Invitados")}</dt><dd className="font-display text-2xl font-extrabold">{referred}</dd></div>
        <div className="rounded-2xl bg-invite-foreground/5 p-3"><dt className="flex items-center gap-1 text-[11px] text-invite-muted"><Wallet size={12} />{t("Ganado por cobrar")}</dt><dd className="font-display text-2xl font-extrabold text-invite">${pending}</dd></div>
      </dl>
      {ready && !preview ? <button type="button" disabled={busy} onClick={onClaim} className="invite-cta mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-extrabold text-invite-surface transition-transform active:scale-[0.98] disabled:opacity-60"><Wallet size={20} />{busy ? t("Enviando…") : `${t("Reclamar")} $${pending}`}</button>
        : missing && <p className="mt-3 text-center text-xs text-invite-muted">{t("Reclamas desde $3. Te faltan")} ${missing}</p>}
      {preview && <p className="mt-3 text-center text-xs text-invite-muted">{t("Vista de ejemplo: inicia sesión para obtener tu enlace real.")}</p>}
    </div>
  </section>;
}
