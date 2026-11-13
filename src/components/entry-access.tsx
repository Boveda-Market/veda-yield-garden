import { useT } from "@/lib/i18n";
import { Suspense, useState } from "react";
import { lazyWithReload } from "@/lib/lazy-reload";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Wallet, ArrowRight, Fingerprint } from "lucide-react";
import { useHomePath } from "@/lib/preferences";
import { Button } from "./ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { SafetyNotice } from "./safety-notice";
const PrivyAccess = lazyWithReload(() => import("./privy-access"));

function EntryButtons() {
  const t = useT();
  const [home] = useHomePath();
  const session = useBovedaSession();
  const [signup, setSignup] = useState(false);
  if (session.ready && session.authenticated) return <div role="dialog" aria-modal="true" aria-label={t("Protégete de estafas")} className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"><div className="w-full max-w-md rounded-xl bg-card shadow-lg"><SafetyNotice className="border-0" /><div className="px-4 pb-4"><Button asChild className="h-12 w-full"><Link to={home}>{t("Continuar al app")}<ArrowRight size={16} /></Link></Button></div></div></div>;
  return <div className="mt-8 w-full max-w-sm space-y-3">
    <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium">
      <button role="tab" aria-selected={!signup} onClick={() => setSignup(false)} className={`rounded-lg py-2 ${!signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Iniciar sesión")}</button>
      <button role="tab" aria-selected={signup} onClick={() => setSignup(true)} className={`rounded-lg py-2 ${signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Crear cuenta")}</button>
    </div>
    <div className="relative rounded-xl border border-primary/40 bg-primary/5 p-2 pt-4"><span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{t("Recomendado · Mayor seguridad")}</span><Button disabled={!session.ready} className="h-14 w-full text-base" onClick={() => session.login("google")}><span className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm"><svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg></span>{t("Continuar con Google")}<ArrowRight size={16} /></Button><p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">{t("Protegido por la verificación en 2 pasos de tu cuenta de Google. Sin contraseñas que puedan robarte.")}</p></div>
    <Button disabled={!session.ready} variant="secondary" className="h-12 w-full" onClick={() => session.login("email")}>{signup ? t("Registrarme con email") : t("Entrar con email")}</Button>
    {!signup && <Button disabled={!session.ready} variant="outline" className="h-auto w-full flex-col gap-1 py-3" onClick={() => session.login("passkey")}><span className="flex items-center gap-2"><Fingerprint size={20} className="text-primary" />{t("Entrar con huella o Face ID")}</span><span className="text-xs font-normal text-muted-foreground">{t("Touch ID, Face ID o PIN de tu dispositivo")}</span></Button>}
    <button type="button" disabled={!session.ready} onClick={() => session.login("wallet")} className="flex w-full items-center justify-center gap-2 pt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"><Wallet size={14} />{t("¿Usas wallet externa? Conectar Phantom o Jupiter")}</button>
    {signup && <p className="text-xs leading-5 text-muted-foreground">{t("Tu primer acceso crea tu cuenta con Privy. Después puedes elegir tu nombre y avatar.")}</p>}
    {session.error && <p role="alert" className="text-sm text-destructive">{session.error}</p>}
    <p className="pt-2 text-xs leading-5 text-muted-foreground">{t("Al continuar, aceptas los")}{" "}<Link className="underline" to="/terminos">{t("términos")}</Link> {t("y conoces la")}{" "}<Link className="underline" to="/privacidad">{t("política de privacidad")}</Link>{t(". Entrar no mueve tus monedas.")}</p>
  </div>;
}
export function EntryAccess() {
  const t = useT();
  return <ClientOnly fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">{t("Preparando acceso…")}</p>}><PrivyAccess><EntryButtons /></PrivyAccess></Suspense></ClientOnly>;
}