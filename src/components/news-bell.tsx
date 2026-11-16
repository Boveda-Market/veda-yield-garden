import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { roundWindowText } from "@/components/predict-position-card";
import { assetOfTitle } from "@/lib/predict";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SUPPORT_URL } from "@/components/safety-notice";
import { usePredictAlerts, type PredictAlert, type RefundAlert } from "@/hooks/use-predict-alerts";
import { useRangeAlerts, type RangeAlert } from "@/hooks/use-range-alerts";
import { useAutopilot } from "@/components/autopilot-toggle";
import { autopilotNotice } from "@/lib/autopilot";
import { ANNOUNCEMENTS, DISMISSED_KEY, SEEN_KEY, announcementSections, latestAnnouncementId, shortDate, type Announcement, type AnnouncementKind } from "@/lib/announcements";

const LABEL: Record<AnnouncementKind, string> = { vault: "Nueva bóveda", market: "Nuevo mercado", policy: "Aviso legal", update: "Novedad" };

const DISMISS_EVENT = "boveda:news-dismissed";
function readDismissed(): string[] {
  try { const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

type Tone = "urgent" | "win" | "info";
const TONE: Record<Tone, { box: string; bar: string; icon: string; chip: string }> = {
  urgent: { box: "border-destructive/40 bg-destructive/5", bar: "bg-destructive", icon: "bg-destructive/15", chip: "bg-destructive/15 text-destructive" },
  win: { box: "border-primary/40 bg-primary/5", bar: "bg-primary", icon: "bg-primary/15", chip: "bg-primary/15 text-primary" },
  info: { box: "border-border bg-card", bar: "bg-primary/50", icon: "bg-secondary", chip: "bg-secondary text-muted-foreground" },
};
const KIND_ICON: Record<AnnouncementKind, string> = { vault: "🏦", market: "⚡", policy: "📜", update: "🚀" };
const ctaClass = (primary: boolean) => `mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold ${primary ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"}`;

/** One notification card: accent bar, emoji tile, label chip, bold title, short body and an optional full-width action. */
function NoticeCard({ tone, icon, label, date, title, onDismiss, children }: { tone: Tone; icon: string; label: string; date?: string | undefined; title: string; onDismiss?: (() => void) | undefined; children?: ReactNode }) {
  const t = useT();
  const c = TONE[tone];
  return <li className={`relative overflow-hidden rounded-2xl border p-4 pl-5 ${c.box}`}>
    <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} />
    {onDismiss && <button type="button" onClick={onDismiss} aria-label={t("Borrar notificación")} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={14} /></button>}
    <div className="flex items-start gap-3 pr-6">
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${c.icon}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${c.chip}`}>{label}</span>
          {date && <time dateTime={date} className="text-muted-foreground">{shortDate(date)}</time>}
        </div>
        <p className="mt-1 font-display font-semibold leading-snug">{title}</p>
      </div>
    </div>
    {children}
  </li>;
}

/** Announcement as a scannable card: lead line plus emoji highlights (first 3, expandable). */
function AnnouncementCard({ a, primary, onDismiss, onNavigate }: { a: Announcement; primary: boolean; onDismiss?: (() => void) | undefined; onNavigate?: (() => void) | undefined }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { lead, items } = announcementSections(a.body);
  const shown = open ? items : items.slice(0, 3);
  return <NoticeCard tone={primary ? "win" : "info"} icon={KIND_ICON[a.kind]} label={t(LABEL[a.kind])} date={a.date} title={t(a.title)} onDismiss={onDismiss}>
    {lead && <p className="mt-2 text-sm text-muted-foreground">{t(lead)}</p>}
    {shown.length > 0 && <ul className="mt-3 space-y-2">{shown.map((it, k) => <li key={k} className="flex gap-2.5 rounded-xl bg-secondary/50 p-2.5">
      <span aria-hidden className="text-base leading-5">{it.icon}</span>
      <div className="min-w-0 text-sm">{it.title && <p className="font-semibold text-foreground">{t(it.title)}</p>}<p className="text-muted-foreground">{t(it.text)}</p></div>
    </li>)}</ul>}
    {items.length > 3 && <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-xs font-semibold text-primary">{open ? t("Ver menos") : t("Ver {n} más", { n: items.length - 3 })}</button>}
    {a.href && a.cta && <Link to={a.href} onClick={onNavigate} className={ctaClass(primary)}>{t(a.cta)} →</Link>}
  </NoticeCard>;
}

/** Announcement history, shared by the bell dialog and the Notifications section. Dismissals stay in this browser; new announcements still appear. */
export function NewsList({ onNavigate, predict = [], refunds = [], ranges = [], autopilot = null }: { onNavigate?: () => void; predict?: PredictAlert[]; refunds?: RefundAlert[]; ranges?: RangeAlert[]; autopilot?: ReturnType<typeof autopilotNotice> }) {
  const t = useT();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const sync = () => setDismissed(readDismissed());
    sync();
    window.addEventListener(DISMISS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(DISMISS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const personal = predict.filter((a) => a.outcome === "won" || !dismissed.includes(a.id));
  const refunded = refunds.filter((a) => !dismissed.includes(a.id));
  const items = showAll ? ANNOUNCEMENTS : ANNOUNCEMENTS.filter((a) => !dismissed.includes(a.id));
  const dismiss = (id: string) => writeDismissed([...new Set([...dismissed, id])]);
  const clearAll = () => { setShowAll(false); writeDismissed(ANNOUNCEMENTS.map((a) => a.id)); };
  const latest = latestAnnouncementId();
  return <div className="mt-2">
    {items.length > 0 && !showAll && <div className="mb-2 flex justify-end">
      <button type="button" onClick={clearAll} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t("Borrar todas")}</button>
    </div>}
    {showAll && <div className="mb-2 flex justify-end">
      <button type="button" onClick={() => setShowAll(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t("Ocultar historial")}</button>
    </div>}
    <ul className="space-y-3">
      {ranges.map((a) => <NoticeCard key={a.id} tone="urgent" icon="🚨" label={t("Bóvedas")} title={t("Bóveda {v} sin generar", { v: a.p.symbol })}>
        <p className="mt-2 text-sm text-muted-foreground">{t("Lleva más de 10 minutos sin generar ganancias. Tu dinero sigue seguro; vuelve a centrarla con un toque y una firma.")}</p>
        <Link to="/wallet" search={{ rebalance: a.p.address }} onClick={onNavigate} className={ctaClass(true)}>🎯 {t("Rebalancear ahora")}</Link>
      </NoticeCard>)}
      {autopilot && !dismissed.includes(autopilot.id) && <NoticeCard tone="info" icon="🤖" label={t("Piloto automático")} date={autopilot.at} title={autopilot.kind === "rebalanced" ? t("Piloto automático rebalanceó tu bóveda") : t("Piloto automático activado")} onDismiss={() => dismiss(autopilot.id)}>
        <p className="mt-2 text-sm text-muted-foreground">{autopilot.kind === "rebalanced" ? t("El precio salió de tu rango y la volvimos a centrar por ti, sin firmas y sin comisión. Ya vuelve a generar.") : t("Si el precio sale de tu rango, la volvemos a centrar por ti, sin firmas y sin comisión. Lo apagas cuando quieras en la tarjeta de tu bóveda.")}</p>
        <Link to="/portfolio" onClick={onNavigate} className={ctaClass(false)}>{t("Ver mi bóveda")} →</Link>
      </NoticeCard>}
      {refunded.map((a) => <NoticeCard key={a.id} tone="win" icon="↩️" label={t("Doble o Nada")} title={t("Orden reembolsada")} onDismiss={() => dismiss(a.id)}>
        {a.r.title && <p className="mt-2 text-xs text-muted-foreground">🎯 {assetOfTitle(a.r.title) ?? ""} · {roundWindowText(a.r.title, null)}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{t("Tu jugada no entró a la ronda porque el precio cambió en ese instante. Te devolvimos ${v} completos; están listos en Mi Billetera.", { v: (Number(a.r.amountMicro) / 1e6).toFixed(2) })}</p>
        <Link to="/wallet" onClick={onNavigate} className={ctaClass(false)}>{t("Ir a Mi Billetera")} →</Link>
      </NoticeCard>)}
      {personal.map((a) => <NoticeCard key={a.id} tone={a.outcome === "won" ? "win" : "info"} icon={a.outcome === "won" ? "🏆" : "📉"} label={t("Doble o Nada")} title={a.outcome === "won" ? t("Ganaste en Sube y Baja") : t("No acertaste en Sube y Baja")} onDismiss={a.outcome === "lost" ? () => dismiss(a.id) : undefined}>
        {a.p.title && <p className="mt-2 text-xs text-muted-foreground">🎯 {assetOfTitle(a.p.title) ?? ""} · {roundWindowText(a.p.title, a.p.closeTime)}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{a.outcome === "won" ? t("Tu premio de ${v} está listo para reclamar.", { v: (Number(a.p.payoutMicro) / 1e6).toFixed(2) }) : t("La ronda terminó en tu contra. Invertiste ${v}.", { v: (Number(a.p.costMicro) / 1e6).toFixed(2) })}</p>
        {a.outcome === "won" && <Link to="/portfolio" onClick={onNavigate} className={ctaClass(true)}>🏆 {t("Reclamar premio")}</Link>}
      </NoticeCard>)}
      {items.length === 0 && personal.length === 0 && refunded.length === 0 && ranges.length === 0 && !(autopilot && !dismissed.includes(autopilot.id)) && <li className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        <span aria-hidden className="mb-1 block text-2xl">🔔</span>
        {ANNOUNCEMENTS.length === 0 ? t("No hay novedades por ahora.") : t("No tienes notificaciones pendientes.")}
        {ANNOUNCEMENTS.length > 0 && <button type="button" onClick={() => setShowAll(true)} className="mt-2 block w-full text-xs font-medium text-primary">{t("Ver historial completo")}</button>}
      </li>}
      {items.map((a) => <AnnouncementCard key={a.id} a={a} primary={a.id === latest} onNavigate={onNavigate} onDismiss={showAll ? undefined : () => dismiss(a.id)} />)}
    </ul>
  </div>;
}

const AP_SEEN = "boveda:autopilot-notice-seen";

export function NewsBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const predict = usePredictAlerts();
  const ranges = useRangeAlerts();
  const [seenRanges, setSeenRanges] = useState<string[]>([]);
  const rangeUnread = ranges.some((a) => !seenRanges.includes(a.id));
  const ap = autopilotNotice(useAutopilot().status, Date.now());
  const [apSeen, setApSeen] = useState<string | null>(null);
  useEffect(() => { try { setApSeen(localStorage.getItem(AP_SEEN) ?? ""); } catch { setApSeen(""); } }, []);
  const apUnread = !!ap && apSeen !== null && apSeen !== ap.id;
  useEffect(() => {
    try { setUnread(ANNOUNCEMENTS.length > 0 && localStorage.getItem(SEEN_KEY) !== latestAnnouncementId()); } catch { /* ignore */ }
  }, []);
  const show = () => {
    setOpen(true); setUnread(false); predict.markSeen(); setSeenRanges(ranges.map((a) => a.id));
    if (ap) { setApSeen(ap.id); try { localStorage.setItem(AP_SEEN, ap.id); } catch { /* ignore */ } }
    try { localStorage.setItem(SEEN_KEY, latestAnnouncementId()); } catch { /* ignore */ }
  };
  return <>
    <button type="button" onClick={show} aria-label={t("Novedades")} className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
      <Bell size={18} />
      {(unread || predict.unread || rangeUnread || apUnread) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="font-display">{t("Novedades")}</DialogTitle>
        <DialogDescription>{t("Nuevas bóvedas, mercados y cambios importantes.")}</DialogDescription>
        <NewsList onNavigate={() => setOpen(false)} predict={predict.alerts} refunds={predict.refunds} ranges={ranges} autopilot={ap} />
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">{t("Únete a nuestro canal de Telegram para enterarte primero")}</a>
      </DialogContent>
    </Dialog>
  </>;
}
