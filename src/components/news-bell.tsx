import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { roundWindowText } from "@/components/predict-position-card";
import { assetOfTitle } from "@/lib/predict";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SUPPORT_URL } from "@/components/safety-notice";
import { usePredictAlerts, type PredictAlert, type RefundAlert } from "@/hooks/use-predict-alerts";
import { ANNOUNCEMENTS, DISMISSED_KEY, SEEN_KEY, latestAnnouncementId, type AnnouncementKind } from "@/lib/announcements";

const LABEL: Record<AnnouncementKind, string> = { vault: "Nueva bóveda", market: "Nuevo mercado", policy: "Aviso legal", update: "Novedad" };

const DISMISS_EVENT = "boveda:news-dismissed";
function readDismissed(): string[] {
  try { const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}
function writeDismissed(ids: string[]) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

/** Announcement history, shared by the bell dialog and the Notifications section. Dismissals stay in this browser; new announcements still appear. */
export function NewsList({ onNavigate, predict = [], refunds = [] }: { onNavigate?: () => void; predict?: PredictAlert[]; refunds?: RefundAlert[] }) {
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
  return <div className="mt-2">
    {items.length > 0 && !showAll && <div className="mb-2 flex justify-end">
      <button type="button" onClick={clearAll} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t("Borrar todas")}</button>
    </div>}
    {showAll && <div className="mb-2 flex justify-end">
      <button type="button" onClick={() => setShowAll(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t("Ocultar historial")}</button>
    </div>}
    <ul className="space-y-3">
      {refunded.map((a) => <li key={a.id} className="relative rounded-xl border border-primary/40 bg-primary/10 p-4">
        <button type="button" onClick={() => dismiss(a.id)} aria-label={t("Borrar notificación")} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={14} /></button>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{t("Doble o Nada")}</span>
        <p className="mt-2 pr-6 font-semibold">{t("Orden reembolsada")}</p>
        {a.r.title && <p className="mt-1 text-xs text-muted-foreground">{assetOfTitle(a.r.title) ?? ""} · {roundWindowText(a.r.title, null)}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{t("Tu jugada no entró a la ronda porque el precio cambió en ese instante. Te devolvimos ${v} completos; están listos en Mi Billetera.", { v: (Number(a.r.amountMicro) / 1e6).toFixed(2) })}</p>
        <Link to="/wallet" onClick={onNavigate} className="mt-3 inline-block text-sm font-medium text-primary">{t("Ir a Mi Billetera")} →</Link>
      </li>)}
      {personal.map((a) => <li key={a.id} className={`relative rounded-xl border p-4 ${a.outcome === "won" ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"}`}>
        {a.outcome === "lost" && <button type="button" onClick={() => dismiss(a.id)} aria-label={t("Borrar notificación")} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={14} /></button>}
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{t("Doble o Nada")}</span>
        <p className="mt-2 font-semibold">{a.outcome === "won" ? `🏆 ${t("Ganaste en Sube y Baja")}` : t("No acertaste en Sube y Baja")}</p>
        {a.p.title && <p className="mt-1 text-xs text-muted-foreground">{assetOfTitle(a.p.title) ?? ""} · {roundWindowText(a.p.title, a.p.closeTime)}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{a.outcome === "won" ? t("Tu premio de {v} USDC está listo para reclamar.", { v: (Number(a.p.payoutMicro) / 1e6).toFixed(2) }) : t("La ronda terminó en tu contra. Invertiste {v} USDC.", { v: (Number(a.p.costMicro) / 1e6).toFixed(2) })}</p>
        {a.outcome === "won" && <Link to="/portfolio" onClick={onNavigate} className="mt-3 inline-block text-sm font-medium text-primary">{t("Reclamar premio")} →</Link>}
      </li>)}
      {items.length === 0 && personal.length === 0 && refunded.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        {ANNOUNCEMENTS.length === 0 ? t("No hay novedades por ahora.") : t("No tienes notificaciones pendientes.")}
        {ANNOUNCEMENTS.length > 0 && <button type="button" onClick={() => setShowAll(true)} className="mt-2 block w-full text-xs font-medium text-primary">{t("Ver historial completo")}</button>}
      </li>}
      {items.map((a) => <li key={a.id} className="relative rounded-xl border border-border bg-secondary/40 p-4">
        {!showAll && <button type="button" onClick={() => dismiss(a.id)} aria-label={t("Borrar notificación")} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={14} /></button>}
        <div className="flex items-center justify-between pr-7 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{t(LABEL[a.kind])}</span>
          <time dateTime={a.date}>{a.date}</time>
        </div>
        <p className="mt-2 font-semibold">{t(a.title)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(a.body)}</p>
        {a.href && a.cta && <Link to={a.href} onClick={onNavigate} className="mt-3 inline-block text-sm font-medium text-primary">{t(a.cta)} →</Link>}
      </li>)}
    </ul>
  </div>;
}

export function NewsBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const predict = usePredictAlerts();
  useEffect(() => {
    try { setUnread(ANNOUNCEMENTS.length > 0 && localStorage.getItem(SEEN_KEY) !== latestAnnouncementId()); } catch { /* ignore */ }
  }, []);
  const show = () => {
    setOpen(true); setUnread(false); predict.markSeen();
    try { localStorage.setItem(SEEN_KEY, latestAnnouncementId()); } catch { /* ignore */ }
  };
  return <>
    <button type="button" onClick={show} aria-label={t("Novedades")} className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
      <Bell size={18} />
      {(unread || predict.unread) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="font-display">{t("Novedades")}</DialogTitle>
        <DialogDescription>{t("Nuevas bóvedas, mercados y cambios importantes.")}</DialogDescription>
        <NewsList onNavigate={() => setOpen(false)} predict={predict.alerts} refunds={predict.refunds} />
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">{t("Únete a nuestro canal de Telegram para enterarte primero")}</a>
      </DialogContent>
    </Dialog>
  </>;
}
