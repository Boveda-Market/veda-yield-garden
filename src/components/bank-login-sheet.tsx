import { useEffect, useRef } from "react";
import { Fingerprint, Mail, ShieldCheck, Wallet } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/google-button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";

/** Bank-style bottom sheet for devices with Face ID / fingerprint: asks for it on open, Google is for switching accounts. */
export function BankLoginSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const session = useBovedaSession();
  const asked = useRef(false);
  useEffect(() => {
    if (!open) { asked.current = false; return; }
    if (asked.current || !session.ready || session.authenticated) return;
    asked.current = true;
    const id = setTimeout(() => session.login("passkey"), 550);
    return () => clearTimeout(id);
  }, [open, session.ready, session.authenticated, session]);
  useEffect(() => { if (session.authenticated && open) onOpenChange(false); }, [session.authenticated, open, onOpenChange]);
  const go = (m: "google" | "email" | "wallet") => { onOpenChange(false); session.login(m); };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <ActionSheetContent>
      <p className="text-center text-[11px] font-bold uppercase tracking-widest text-primary">● BÓVEDA · {t("Acceso seguro")}</p>
      <DialogTitle className="mt-1 px-10 text-center font-display text-2xl sm:px-12">{t("Bienvenido de nuevo")}</DialogTitle>
      <DialogDescription className="text-center text-sm text-muted-foreground">{t("Tu acceso biométrico está listo en este dispositivo")}</DialogDescription>
      <button type="button" aria-label={t("Entrar con huella o Face ID")} disabled={!session.ready} onClick={() => session.login("passkey")} className="relative mx-auto mt-5 grid size-24 place-items-center rounded-full border-2 border-primary/60 bg-primary/10 text-primary">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
        <Fingerprint size={44} />
      </button>
      <Button disabled={!session.ready} className="mt-5 h-14 w-full text-base" onClick={() => session.login("passkey")}><Fingerprint size={20} />{t("Entrar con huella o Face ID")}</Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("Toca el sensor de tu teléfono para entrar al instante")}</p>
      <div className="my-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("¿Quieres cambiar de cuenta?")}<span className="h-px flex-1 bg-border" /></div>
      <GoogleButton disabled={!session.ready} className="h-12 w-full" onClick={() => go("google")}>{t("Entrar con otra cuenta de Google")}</GoogleButton>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <button type="button" onClick={() => go("email")} className="flex items-center gap-1 underline-offset-4 hover:underline"><Mail size={13} />{t("Entrar con email")}</button>
        <span aria-hidden>·</span>
        <button type="button" onClick={() => go("wallet")} className="flex items-center gap-1 underline-offset-4 hover:underline"><Wallet size={13} />{t("Wallet externa")}</button>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck size={13} className="text-primary" />{t("Protegido por la seguridad biométrica de tu dispositivo")}</p>
    </ActionSheetContent>
  </Dialog>;
}
