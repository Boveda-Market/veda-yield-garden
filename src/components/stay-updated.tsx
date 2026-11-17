import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SUPPORT_URL } from "./safety-notice";

const KEY = "boveda:stay-updated-dismissed";

/** Invites users to follow official updates (Telegram channel + in-app bell). Dismissible when `dismissible`. */
export function StayUpdated({ dismissible = false }: { dismissible?: boolean }) {
  const t = useT();
  const [hidden, setHidden] = useState(dismissible);
  useEffect(() => { if (dismissible) { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); } } }, [dismissible]);
  if (hidden) return null;
  const close = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  return <section className="relative mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
    {dismissible && <button type="button" onClick={close} aria-label={t("Cerrar")} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"><X size={16} /></button>}
    <div className="flex items-start gap-3 pr-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><BellRing size={18} /></span>
      <div>
        <p className="font-semibold">{t("Mantente al día con BÓVEDA")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("Recibe avisos oficiales de nuevas bóvedas, mercados, cambios de intereses y alertas de seguridad.")}</p>
      </div>
    </div>
    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">{t("Activar avisos en Telegram")}</a>
    <p className="mt-2 text-xs text-muted-foreground">{t("También verás cada novedad en la campanita de arriba. Nunca te escribiremos primero por privado.")}</p>
  </section>;
}
