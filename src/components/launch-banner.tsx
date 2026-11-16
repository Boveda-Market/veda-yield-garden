import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Rocket, X } from "lucide-react";
import { useT } from "@/lib/i18n";

const KEY = "boveda:banner:2026-11-coinbase-telegram";

/** One-time dismissible news banner; once closed it never shows again on this device. */
export function LaunchBanner() {
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => { try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); } }, []);
  if (!show) return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  return <div role="status" className="sticky top-2 z-30 mb-4 flex items-start gap-3 rounded-2xl border border-primary/40 bg-card/95 p-3 pr-10 shadow-lg backdrop-blur">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Rocket size={16} /></span>
    <div className="min-w-0 text-sm">
      <p className="font-semibold">{t("Novedades: Coinbase y alertas en Telegram")}</p>
      <p className="mt-0.5 text-muted-foreground">{t("Añade dólares y retira a tu banco con Coinbase, y recibe avisos de tus ganancias en Telegram.")}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-primary">
        <Link to="/wallet" onClick={close} className="hover:underline">{t("Ir a Mi Billetera")}</Link>
        <Link to="/notificaciones" onClick={close} className="hover:underline">{t("Activar alertas")}</Link>
      </div>
    </div>
    <button type="button" onClick={close} aria-label={t("Cerrar")} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"><X size={16} /></button>
  </div>;
}
