import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Share2, ChevronRight, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { getAffiliateDashboard } from "@/lib/affiliate.functions";

export const shareText = (t: (s: string) => string) => t("Prueba BÓVEDA: dólares USDC con rendimientos y predicciones en vivo. Entra con mi enlace:");

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

/** Highlighted "Invite and earn" card for Mi wallet. */
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
