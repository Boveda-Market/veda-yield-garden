import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SUPPORT_URL } from "@/components/safety-notice";
import { ANNOUNCEMENTS, SEEN_KEY, latestAnnouncementId, type AnnouncementKind } from "@/lib/announcements";

const LABEL: Record<AnnouncementKind, string> = { vault: "Nueva bóveda", market: "Nuevo mercado", policy: "Aviso legal", update: "Novedad" };

/** Announcement history, shared by the bell dialog and the Notifications section. */
export function NewsList({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  return <ul className="mt-2 space-y-3">
    {ANNOUNCEMENTS.length === 0 && <li className="text-sm text-muted-foreground">{t("No hay novedades por ahora.")}</li>}
    {ANNOUNCEMENTS.map((a) => <li key={a.id} className="rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{t(LABEL[a.kind])}</span>
        <time dateTime={a.date}>{a.date}</time>
      </div>
      <p className="mt-2 font-semibold">{t(a.title)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(a.body)}</p>
      {a.href && a.cta && <Link to={a.href} onClick={onNavigate} className="mt-3 inline-block text-sm font-medium text-primary">{t(a.cta)} →</Link>}
    </li>)}
  </ul>;
}

export function NewsBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    try { setUnread(ANNOUNCEMENTS.length > 0 && localStorage.getItem(SEEN_KEY) !== latestAnnouncementId()); } catch { /* ignore */ }
  }, []);
  const show = () => {
    setOpen(true); setUnread(false);
    try { localStorage.setItem(SEEN_KEY, latestAnnouncementId()); } catch { /* ignore */ }
  };
  return <>
    <button type="button" onClick={show} aria-label={t("Novedades")} className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
      <Bell size={18} />
      {unread && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="font-display">{t("Novedades")}</DialogTitle>
        <DialogDescription>{t("Nuevas bóvedas, mercados y cambios importantes.")}</DialogDescription>
        <NewsList onNavigate={() => setOpen(false)} />
        <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">{t("Únete a nuestro canal de Telegram para enterarte primero")}</a>
      </DialogContent>
    </Dialog>
  </>;
}
