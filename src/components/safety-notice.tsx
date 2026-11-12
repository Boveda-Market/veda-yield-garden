import { ShieldCheck, Send } from "lucide-react";
import { useT } from "@/lib/i18n";

export const SUPPORT_URL = "https://t.me/bovedamarket";

export function SafetyNotice({ className = "" }: { className?: string }) {
  const t = useT();
  return <div className={`rounded-lg border border-border bg-card p-4 text-left text-xs leading-5 text-muted-foreground ${className}`}>
    <p className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck size={16} className="text-primary" aria-hidden />{t("Protégete de estafas")}</p>
    <p className="mt-2">{t("BÓVEDA no tiene cuentas en redes sociales y nunca te escribirá primero. Nadie del equipo te pedirá claves, frases semilla, códigos ni envíos de fondos. Si alguien te contacta por privado diciendo ser de BÓVEDA, es una estafa.")}</p>
    <p className="mt-2">{t("Comprueba siempre la dirección de la página antes de entrar o firmar.")}</p>
    <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-primary underline"><Send size={14} aria-hidden />{t("Soporte en Telegram")}</a>
    <p className="mt-1">{t("Es el único canal oficial. Los administradores nunca te escribirán por privado.")}</p>
  </div>;
}
