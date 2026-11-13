import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { TelegramAlerts } from "./telegram-alerts";
import { StayUpdated } from "./stay-updated";
import { NewsList } from "./news-bell";

export const NOTIFICATIONS_ANCHOR = "notificaciones";

/** Mi cuenta → Notificaciones: personal Telegram alerts, official channel and the news history in one place. */
export function NotificationsCenter() {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  // The "Activar avisos" invite only shows while Telegram is not connected (hidden until the status loads).
  const [linked, setLinked] = useState<boolean | null>(null);
  useEffect(() => { if (window.location.hash === `#${NOTIFICATIONS_ANCHOR}`) ref.current?.scrollIntoView({ block: "start" }); }, []);
  return <section ref={ref} id={NOTIFICATIONS_ANCHOR} aria-labelledby="notificaciones-title" className="mb-6 scroll-mt-20">
    <h2 id="notificaciones-title" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Bell size={18} className="text-primary" />{t("Notificaciones")}</h2>
    <TelegramAlerts onLinkedChange={setLinked} />
    {linked === false && <StayUpdated />}
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-semibold">{t("Historial de novedades")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("Nuevas bóvedas, mercados y cambios importantes.")}</p>
      <NewsList />
    </div>
  </section>;
}
