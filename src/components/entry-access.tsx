import { LoginAlert } from "@/components/login-alert";
import { useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { HostedSession } from "./session-host";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Fingerprint } from "lucide-react";
import { isReturning, markReturning, useHomePath } from "@/lib/preferences";
import { isHeroReview } from "@/lib/hero-variants";
import { Button } from "./ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { CoinbaseNote } from "./coinbase-note";
import { GoogleButton } from "./google-button";
import { BootSplash } from "./boot-splash";
import { deviceHasPasskey, rememberPasskey } from "@/lib/passkey-device";
import { useServerFn } from "@tanstack/react-start";
import { getRealWallet } from "@/lib/solana.functions";
import { readCache } from "@/lib/cached-query";
import type { RealWalletResult } from "@/lib/solana-data";

/** After sign-in: people with open vaults land on Mi Portafolio, everyone else on Billetera. */
export function landingFor(r: RealWalletResult | undefined | null): "/wallet" | "/portfolio" {
  return r?.success && r.data.positions.length > 0 ? "/portfolio" : "/wallet";
}
const userChoseHome = () => { try { return localStorage.getItem("boveda:home") !== null; } catch { return false; } };

function EntryButtons() {
  const t = useT();
  const [home] = useHomePath();
  const session = useBovedaSession();
  const readWallet = useServerFn(getRealWallet);
  const [signup, setSignup] = useState(false);
  const [bio, setBio] = useState(false);
  useEffect(() => { if (deviceHasPasskey()) setBio(true); }, []);
  useEffect(() => { if ((session.security?.passkeyCount ?? 0) > 0) rememberPasskey(); }, [session.security?.passkeyCount]);
  // Ask for the fingerprint once per visit; cancelling stays silent and it won't pop up again, so Google stays free to switch accounts.
  useEffect(() => {
    if (!bio || signup || !session.ready || session.authenticated) return;
    try { if (sessionStorage.getItem("boveda:passkey-auto")) return; sessionStorage.setItem("boveda:passkey-auto", "1"); } catch { return; }
    const id = setTimeout(() => session.login("passkey"), 400);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bio, signup, session.ready, session.authenticated]);
  const navigate = useNavigate();
  const wasReturning = useRef<boolean | null>(null);
  if (wasReturning.current === null && typeof window !== "undefined") wasReturning.current = isReturning() && !isHeroReview();
  useEffect(() => {
    if (!session.ready || !session.authenticated) return;
    markReturning();
    if (isHeroReview()) return;
    // Signed in: go straight to the screen they wanted (or their home), no extra "continue" tap.
    let target: string = home;
    let cancelled = false;
    let id: ReturnType<typeof setTimeout> | undefined;
    let explicit = userChoseHome();
    try { const saved = sessionStorage.getItem("boveda:after-login"); if (saved && saved.startsWith("/") && !saved.startsWith("//")) { target = saved; explicit = true; } sessionStorage.removeItem("boveda:after-login"); } catch { /* ignore */ }
    // Never land back on the home page (that left the loading screen waiting forever after switching accounts).
    if (target === "/" || target.startsWith("/#") || target.startsWith("/?")) { target = home; explicit = userChoseHome(); }
    try { sessionStorage.setItem("boveda:auth-pending", String(Date.now())); } catch { /* ignore */ }
    const go = (to: string) => {
      if (cancelled) return;
      void navigate({ to, replace: true });
      // Safety net: if the screen hasn't changed shortly after, do a clean full load of the target (what "Reintentar" did).
      id = setTimeout(() => { if (window.location.pathname === "/") window.location.replace(to); }, 2500);
    };
    const wallet = session.walletAddress;
    if (explicit || !wallet) { go(explicit ? target : "/wallet"); }
    else {
      const cached = readCache<RealWalletResult>(`vaults:${wallet}`);
      if (cached?.success) go(landingFor(cached));
      else {
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), 1500));
        void Promise.race([readWallet({ data: { wallet } }).catch(() => null), timeout]).then((r) => go(landingFor(r)));
      }
    }
    return () => { cancelled = true; if (id) clearTimeout(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.ready, session.authenticated, home, navigate]);
  // Returning visitors: cover the whole startup (secure access → redirect to their home) with one loading screen.
  if (wasReturning.current && (!(session.sessionKnown || session.ready) || session.authenticated)) return <BootSplash />;
  if (session.ready && session.authenticated && isHeroReview()) return <div className="mt-8 w-full max-w-sm"><Button asChild className="h-12 w-full"><Link to={home}>{t("Continuar al app")}<ArrowRight size={16} /></Link></Button></div>;
  if (session.ready && session.authenticated) return <BootSplash />;
  return <div className="mt-8 w-full max-w-sm space-y-3">
    <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium">
      <button role="tab" aria-selected={!signup} onClick={() => setSignup(false)} className={`rounded-lg py-2 ${!signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Iniciar sesión")}</button>
      <button role="tab" aria-selected={signup} onClick={() => setSignup(true)} className={`rounded-lg py-2 ${signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Crear cuenta")}</button>
    </div>
    {bio && !signup && <div className="rounded-xl border border-primary/50 bg-primary/10 p-2"><Button disabled={!session.ready} className="h-14 w-full text-base" onClick={() => session.login("passkey")}><Fingerprint size={22} />{t("Entrar con huella o Face ID")}</Button></div>}
    <div className="relative rounded-xl border border-primary/40 bg-primary/5 p-2 pt-4"><span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{bio && !signup ? t("¿Otra cuenta?") : t("Recomendado · Mayor seguridad")}</span><GoogleButton disabled={!session.ready} arrow className="h-14 w-full text-base" onClick={() => session.login("google")}>{bio && !signup ? t("Cambiar de cuenta con Google") : t("Continuar con Google")}</GoogleButton><p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">{bio && !signup ? t("Inicia sesión con otro correo de Google o cambia de perfil.") : t("Protegido por la verificación en 2 pasos de tu cuenta de Google. Sin contraseñas que puedan robarte.")}</p><CoinbaseNote className="mt-2 text-center text-xs text-muted-foreground" /></div>
    <Button disabled={!session.ready} variant="secondary" className="h-12 w-full" onClick={() => session.login("email")}>{signup ? t("Registrarme con email") : t("Entrar con email")}</Button>
    {!signup && !bio && <Button disabled={!session.ready} variant="outline" className="h-auto w-full flex-col gap-1 py-3" onClick={() => session.login("passkey")}><span className="flex items-center gap-2"><Fingerprint size={20} className="text-primary" />{t("Entrar con huella o Face ID")}</span><span className="text-xs font-normal text-muted-foreground">{t("Touch ID, Face ID o PIN de tu dispositivo")}</span></Button>}
    {signup && <p className="text-xs leading-5 text-muted-foreground">{t("Tu primer acceso crea tu cuenta con Privy. Después puedes elegir tu nombre y avatar.")}</p>}
    {session.error && <LoginAlert message={session.error} onDismiss={() => session.clearError?.()} />}
    <p className="pt-2 text-xs leading-5 text-muted-foreground">{t("Al continuar, aceptas los")}{" "}<Link className="underline" to="/terminos">{t("términos")}</Link> {t("y conoces la")}{" "}<Link className="underline" to="/privacidad">{t("política de privacidad")}</Link>.</p>
  </div>;
}
export function EntryAccess() {
  const t = useT();
  return <ClientOnly fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><HostedSession fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><EntryButtons /></HostedSession></ClientOnly>;
}
function AdvancedButton() {
  const t = useT();
  const session = useBovedaSession();
  return <button type="button" disabled={!session.ready} onClick={() => session.login("wallet")} className="underline-offset-2 hover:underline disabled:opacity-50">{t("Avanzado")}</button>;
}
/** Footer-only external wallet access, kept out of the main sign-in card. */
export function AdvancedAccess() {
  const t = useT();
  return <ClientOnly fallback={<span>{t("Avanzado")}</span>}><HostedSession fallback={<span>{t("Avanzado")}</span>}><AdvancedButton /></HostedSession></ClientOnly>;
}
