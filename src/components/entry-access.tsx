import { useT } from "@/lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { Wallet, ArrowRight, LogOut, Fingerprint } from "lucide-react";
import { Button } from "./ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
const PrivyAccess = lazy(() => import("./privy-access"));

function EntryButtons() {
  const t = useT();
  const session = useBovedaSession();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [startedSignedOut, setStartedSignedOut] = useState(false);
  useEffect(() => {
    if (!session.ready) return;
    if (!session.authenticated) setStartedSignedOut(true);
    else if (startedSignedOut) void navigate({ to: "/wallet", replace: true });
  }, [session.ready, session.authenticated, startedSignedOut]);
  if (session.ready && session.authenticated) return <div className="mt-8 w-full max-w-sm"><p className="mb-4 text-sm text-muted-foreground">{t("Tu sesión está abierta.")}</p><Button asChild className="h-12 w-full"><Link to="/wallet">{t("Entrar a mi cuenta")}<ArrowRight size={16} /></Link></Button><Button variant="outline" className="mt-3 h-12 w-full" onClick={() => void session.logout()}><LogOut size={16} />{t("Cerrar sesión")}</Button></div>;
  return <div className="mt-8 w-full max-w-sm space-y-3">
    <div role="tablist" className="mb-4 grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium">
      <button role="tab" aria-selected={!signup} onClick={() => setSignup(false)} className={`rounded-lg py-2 ${!signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Iniciar sesión")}</button>
      <button role="tab" aria-selected={signup} onClick={() => setSignup(true)} className={`rounded-lg py-2 ${signup ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{t("Crear cuenta")}</button>
    </div>
    <Button disabled={!session.ready} className="h-12 w-full" onClick={() => session.login("google")}>{t("Continuar con Google")}<ArrowRight size={16} /></Button>
    <Button disabled={!session.ready} variant="secondary" className="h-12 w-full" onClick={() => session.login("email")}>{signup ? t("Registrarme con email") : t("Entrar con email")}</Button>
    {!signup && <Button disabled={!session.ready} variant="outline" className="h-12 w-full" onClick={() => session.login("passkey")}><Fingerprint size={16} />{t("Entrar con passkey")}</Button>}
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