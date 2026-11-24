import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useT } from "@/lib/i18n";
import privyMark from "@/assets/privy-transparent.png.asset.json";

type EmailLoginSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sendCode: (options: { email: string }) => Promise<void>;
  loginWithCode: (options: { code: string }) => Promise<void>;
};

/** Only Privy's SDK sends/verifies codes. No local code or session is trusted. */
export function EmailLoginSheet({ open, onOpenChange, sendCode, loginWithCode }: EmailLoginSheetProps) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!resendAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const send = async (address: string) => {
    if (locked.current || verified) return;
    locked.current = true;
    setBusy(true); setError(null);
    try {
      await sendCode({ email: address.trim() });
      if (!alive.current) return;
      setSentTo(address.trim()); setCode("");
      const time = Date.now(); setNow(time); setResendAt(time + 30_000);
    } catch {
      if (alive.current) setError(t("No pudimos enviar el código. Revisa tu correo y vuelve a intentarlo."));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const verify = async (value: string) => {
    if (locked.current || verified || !sentTo || !/^\d{6}$/.test(value)) return;
    locked.current = true;
    setBusy(true); setError(null);
    try {
      await loginWithCode({ code: value });
      if (alive.current) setVerified(true);
      // The shared session closes this card only when Privy reports authenticated.
    } catch {
      if (alive.current) setError(t("El código no se pudo verificar. Revisa los 6 números o solicita uno nuevo."));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <ActionSheetContent className="sm:max-w-md" closeLabel={t("Cerrar")}>
      <div className="pr-10"><BrandLogo size="sm" live={false} /></div>
      <div className="space-y-3 pt-1">
        {sentTo && <Button type="button" variant="ghost" size="sm" className="-ml-2" disabled={busy || verified} onClick={() => { setSentTo(null); setCode(""); setError(null); }}><ArrowLeft size={16} />{t("Cambiar correo")}</Button>}
        <div className="grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">{sentTo ? <ShieldCheck size={24} /> : <Mail size={24} />}</div>
        <DialogTitle className="font-display text-2xl font-bold text-foreground">{sentTo ? t("Revisa tu correo") : t("Entra con tu correo")}</DialogTitle>
        <DialogDescription className="text-sm leading-6 text-muted-foreground">{sentTo ? <>{t("Enviamos tu código de acceso a")}<strong className="block break-all text-foreground">{sentTo}</strong></> : t("Tu cuenta de Bóveda Market, sin contraseña.")}</DialogDescription>
      </div>

      {!sentTo ? <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void send(email); }}>
        <div className="grid gap-2">
          <label htmlFor="boveda-login-email" className="text-sm font-semibold">{t("Correo electrónico")}</label>
          <Input id="boveda-login-email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} placeholder="tu@correo.com" disabled={busy} className="h-12 bg-card text-base md:text-base" aria-describedby={error ? "email-login-error" : undefined} />
        </div>
        <Button type="submit" disabled={busy || !email.trim()} className="h-12 w-full text-base">{busy ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : <ArrowRight size={18} />}{busy ? t("Enviando código…") : t("Enviar código de acceso")}</Button>
      </form> : <div className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="boveda-login-code" className="text-sm font-semibold">{t("Código de 6 números")}</label>
          <InputOTP id="boveda-login-code" aria-label={t("Código de 6 números")} maxLength={6} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code" value={code} disabled={busy || verified} onChange={(value) => { setCode(value); setError(null); }} onComplete={(value) => { void verify(value); }} containerClassName="w-full" aria-describedby={error ? "email-login-error" : "email-code-hint"}>
            <InputOTPGroup className="grid w-full grid-cols-6 gap-2">{[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="h-14 w-full rounded-md border border-input bg-card font-mono text-2xl font-semibold first:rounded-md last:rounded-md" />)}</InputOTPGroup>
          </InputOTP>
          <p id="email-code-hint" className="text-xs text-muted-foreground">{t("El código vence en 10 minutos. No lo compartas.")}</p>
        </div>
        <div className="flex min-h-10 items-center justify-center" role="status" aria-live="polite">
          {busy || verified ? <span className="flex items-center gap-2 text-sm font-semibold text-primary"><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />{verified ? t("Entrando a tu cuenta…") : t("Verificando código…")}</span> : <Button type="button" variant="ghost" className="min-h-11 text-primary" disabled={seconds > 0} onClick={() => { if (seconds === 0) void send(sentTo); }}>{seconds > 0 ? t("Reenviar código en {seconds} s", { seconds }) : t("Reenviar código")}</Button>}
        </div>
      </div>}
      {error && <p id="email-login-error" role="alert" className="text-sm leading-5 text-destructive">{error}</p>}
      <div className="grid gap-3 border-t border-border pt-4">
        <p className="text-center text-xs leading-5 text-muted-foreground">{sentTo ? t("Si no lo encuentras, revisa spam o correo no deseado.") : t("Recibirás un código para entrar de forma segura.")}</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><span>{t("Protegido por")}</span><img src={privyMark.url} alt="" className="size-5 object-contain [html:not(.light)_&]:invert" /><span className="text-lg font-bold text-foreground">privy</span></div>
      </div>
    </ActionSheetContent>
  </Dialog>;
}