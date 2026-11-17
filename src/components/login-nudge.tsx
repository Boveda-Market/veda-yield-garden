import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { GoogleButton } from "@/components/google-button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { CoinbaseNote } from "@/components/coinbase-note";
import { useT } from "@/lib/i18n";
import { BankLoginSheet } from "@/components/bank-login-sheet";
import { deviceHasPasskey } from "@/lib/passkey-device";

const SEEN_KEY = "boveda:login-nudge";
const DELAY_MS = 30_000;
const SCROLL_RATIO = 0.5;

/** Gentle sign-in sheet for visitors: shows once per visit after 30 s or half-page scroll. */
export function LoginNudge() {
  const t = useT();
  const session = useBovedaSession();
  const [open, setOpen] = useState(false);
  const signedIn = session.authenticated;
  useEffect(() => {
    if (signedIn || !session.ready) return;
    if (new URLSearchParams(window.location.search).has("acceso")) { setOpen(true); return; }
    try { if (sessionStorage.getItem(SEEN_KEY)) return; } catch { /* ignore */ }
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
      if (!document.querySelector("[role=dialog]")) setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_RATIO) show();
    };
    const timer = window.setTimeout(show, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [signedIn, session.ready]);
  return <LoginSheet open={open} onOpenChange={setOpen} />;
}

/** Sign-in sheet (Google first), shared by the timed nudge and by actions that need an account, e.g. Depositar. */
export function LoginSheet({ open, onOpenChange, title, body }: { open: boolean; onOpenChange: (o: boolean) => void; title?: string | undefined; body?: string | undefined }) {
  const t = useT();
  const session = useBovedaSession();
  useEffect(() => { if (session.authenticated && open) onOpenChange(false); }, [session.authenticated, open, onOpenChange]);
  const close = () => onOpenChange(false);
  const [bio, setBio] = useState(false);
  useEffect(() => { setBio(deviceHasPasskey()); }, [open]);
  if (bio) return <BankLoginSheet open={open} onOpenChange={onOpenChange} />;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <ActionSheetContent>
      <DialogTitle className="pr-10 font-display text-xl">{title ?? t("¿Listo para tu primera jugada?")}</DialogTitle>
      <DialogDescription asChild><div>{body && <p className="mb-2 text-sm text-muted-foreground">{body}</p>}<CoinbaseNote /></div></DialogDescription>
      <div className="mt-4 grid gap-2">
        <GoogleButton className="h-12 w-full" onClick={() => { close(); session.login("google"); }}>{t("Continuar con Google")}</GoogleButton>
        <Button variant="secondary" className="h-11 w-full" onClick={() => { close(); session.login("email"); }}>{t("Entrar con email")}</Button>
        <Button variant="ghost" className="w-full" onClick={close}>{t("Seguir mirando")}</Button>
      </div>
    </ActionSheetContent>
  </Dialog>;
}
