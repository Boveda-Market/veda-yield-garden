import { useEffect, useState } from "react";
import { ShieldCheck, Send, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { shouldShowSafety } from "@/lib/safety-reminder";

export const SUPPORT_URL = "https://t.me/bovedamarket";
export const SUPPORT_EMAIL = "admin@bovedamarket.app";
const OLD_KEY = "boveda_security_notice_v1";
const VISITS = "boveda_safety_visits";
const SESSION = "boveda_safety_session";

/** The single official safety notice: no social media, only Telegram + email, nobody writes first. */
export function SafetyNotice({ className = "" }: { className?: string }) {
  const t = useT();
  return <div className={`space-y-3 text-sm leading-6 ${className}`}>
    <p>🚫 <b>{t("Cero redes sociales:")}</b> {t("BÓVEDA no tiene cuentas en Instagram, X, TikTok, Facebook ni Discord.")}</p>
    <p>📢 <b>{t("Únicos canales oficiales:")}</b></p>
    <div className="grid gap-2">
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 font-semibold text-primary"><Send size={16} aria-hidden />t.me/bovedamarket</a>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 font-semibold text-primary"><Mail size={16} aria-hidden />{SUPPORT_EMAIL}</a>
    </div>
    <p className="rounded-xl border border-primary/40 bg-primary/5 p-3">⚠️ <b>{t("Nadie del equipo te escribirá primero.")}</b> {t("Jamás te pediremos dinero, claves, códigos ni frases de recuperación. Si alguien te contacta diciendo ser de BÓVEDA, es una estafa.")}</p>
  </div>;
}

/** Shown to signed-in users on their first visit and every few visits after (see safety-reminder.ts). */
export function SafetyWelcome() {
  const t = useT();
  const [open, setOpen] = useState(false);
  // One visit = one browser session; the count lives on the device so the reminder returns every few visits.
  useEffect(() => { try {
    if (sessionStorage.getItem(SESSION)) return;
    sessionStorage.setItem(SESSION, "1");
    const prev = Number(localStorage.getItem(VISITS) ?? (localStorage.getItem(OLD_KEY) ? 1 : 0)) || 0;
    const visit = prev + 1;
    localStorage.setItem(VISITS, String(visit));
    if (shouldShowSafety(visit)) setOpen(true);
  } catch { /* ignore */ } }, []);
  const close = () => setOpen(false);
  return <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
    <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
      <DialogTitle className="flex items-center gap-2 font-display text-xl"><ShieldCheck size={22} className="text-primary" />{t("Aviso oficial de seguridad")}</DialogTitle>
      <DialogDescription>{t("Protege tus fondos de imitadores y estafadores.")}</DialogDescription>
      <SafetyNotice />
      <Button className="mt-1 h-12 w-full" onClick={close}>{t("Entendido, entrar a BÓVEDA")}</Button>
    </DialogContent>
  </Dialog>;
}
