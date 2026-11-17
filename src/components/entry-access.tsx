import { LoginAlert } from "@/components/login-alert";
import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { HostedSession } from "./session-host";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { Wallet, ArrowRight, Fingerprint } from "lucide-react";
import { isReturning, markReturning, useHomePath } from "@/lib/preferences";
import { isHeroReview } from "@/lib/hero-variants";
import { Button } from "./ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { CoinbaseNote } from "./coinbase-note";
import { GoogleButton } from "./google-button";
import { BootSplash } from "./boot-splash";
import { BankLoginSheet } from "./bank-login-sheet";
import { deviceHasPasskey, rememberPasskey } from "@/lib/passkey-device";

function EntryButtons() {
  const t = useT();
  const [home] = useHomePath();
  const session = useBovedaSession();
  const [signup, setSignup] = useState(false);
  const [bio, setBio] = useState(false);
  useEffect(() => { if (deviceHasPasskey()) setBio(true); }, []);
  useEffect(() => { if ((session.security?.passkeyCount ?? 0) > 0) rememberPasskey(); }, [session.security?.passkeyCount]);
  const navigate = useNavigate();
  const wasReturning = useRef<boolean | null>(null);
  if (wasReturning.current === null && typeof window !== "undefined") wasReturning.current = isReturning() && !isHeroReview();
  useEffect(() => {
    if (!session.ready || !session.authenticated) return;
    markReturning();
    if (isHeroReview()) return;
    // Signed in: go straight to the screen they wanted (or their home), no extra "continue" tap.
    let target: string = home;
    try { const saved = sessionStorage.getItem("boveda:after-login"); if (saved && saved.startsWith("/") && !saved.startsWith("//")) target = saved; sessionStorage.removeItem("boveda:after-login"); } catch { /* ignore */ }
    // Never land back on the home page (that left the loading screen waiting forever after switching accounts).
    if (target === "/" || target.startsWith("/#") || target.startsWith("/?")) target = home;
    try { sessionStorage.setItem("boveda:auth-pending", String(Date.now())); } catch { /* ignore */ }
    void navigate({ to: target, replace: true });
    // Safety net: if the screen hasn't changed shortly after, do a clean full load of the target (what "Reintentar" did).
    const id = setTimeout(() => { if (window.location.pathname === "/") window.location.replace(target); }, 2500);
    return () => clearTimeout(id);
  }, [session.ready, session.authenticated, home, navigate]);
  // Returning visitors: cover the whole startup (secure access → redirect to their home) with one loading screen.
  if (wasReturning.current && (!(session.sessionKnown || session.ready) || session.authenticated)) return <BootSplash />;
  if (session.ready && session.authenticated && isHeroReview()) return <div className="mt-8 w-full max-w-sm"><Button asChild className="h-12 w-full"><Link to={home}>{t("Continuar al app")}<ArrowRight size={16} /></Link></Button></div>;
  if (session.ready && session.authenticated) return <BootSplash />;
  return <div className="mt-8 w-full max-w-sm space-y-3">
    <BankLoginSheet open={bio && !signup} onOpenChange={setBio} />
    <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium">
      <button role="tab" aria-selected={!signup} onClick={() => setSignup(false)} className={`rounded-lg py-2 ${!signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Iniciar sesión")}</button>
      <button role="tab" aria-selected={signup} onClick={() => setSignup(true)} className={`rounded-lg py-2 ${signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Crear cuenta")}</button>
    </div>
    <div className="relative rounded-xl border border-primary/40 bg-primary/5 p-2 pt-4"><span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{t("Recomendado · Mayor seguridad")}</span><GoogleButton disabled={!session.ready} arrow className="h-14 w-full text-base" onClick={() => session.login("google")}>{t("Continuar con Google")}</GoogleButton><p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">{t("Protegido por la verificación en 2 pasos de tu cuenta de Google. Sin contraseñas que puedan robarte.")}</p><CoinbaseNote className="mt-2 text-center text-xs text-muted-foreground" /></div>
    <Button disabled={!session.ready} variant="secondary" className="h-12 w-full" onClick={() => session.login("email")}>{signup ? t("Registrarme con email") : t("Entrar con email")}</Button>
    {!signup && <Button disabled={!session.ready} variant="outline" className="h-auto w-full flex-col gap-1 py-3" onClick={() => session.login("passkey")}><span className="flex items-center gap-2"><Fingerprint size={20} className="text-primary" />{t("Entrar con huella o Face ID")}</span><span className="text-xs font-normal text-muted-foreground">{t("Touch ID, Face ID o PIN de tu dispositivo")}</span></Button>}
    <button type="button" disabled={!session.ready} onClick={() => session.login("wallet")} className="flex w-full items-center justify-center gap-2 pt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"><Wallet size={14} />{t("¿Usas wallet externa? Phantom, Jupiter u otras")}</button>
    {signup && <p className="text-xs leading-5 text-muted-foreground">{t("Tu primer acceso crea tu cuenta con Privy. Después puedes elegir tu nombre y avatar.")}</p>}
    {session.error && <LoginAlert message={session.error} onDismiss={() => session.clearError?.()} />}
    <p className="pt-2 text-xs leading-5 text-muted-foreground">{t("Al continuar, aceptas los")}{" "}<Link className="underline" to="/terminos">{t("términos")}</Link> {t("y conoces la")}{" "}<Link className="underline" to="/privacidad">{t("política de privacidad")}</Link>.</p>
  </div>;
}
export function EntryAccess() {
  const t = useT();
  return <ClientOnly fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><HostedSession fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><EntryButtons /></HostedSession></ClientOnly>;
}