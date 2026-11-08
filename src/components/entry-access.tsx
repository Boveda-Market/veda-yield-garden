import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { Wallet, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
const PrivyAccess = lazy(() => import("./privy-access"));

function EntryButtons() {
  const session = useBovedaSession();
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [startedSignedOut, setStartedSignedOut] = useState(false);
  useEffect(() => {
    if (!session.ready) return;
    if (!session.authenticated) setStartedSignedOut(true);
    else if (startedSignedOut) void navigate({ to: "/app", replace: true });
  }, [session.ready, session.authenticated, startedSignedOut]);
  if (session.ready && session.authenticated) return <div className="mt-8 w-full max-w-sm"><p className="mb-4 text-sm text-muted-foreground">Tu sesión está abierta.</p><Button asChild className="h-12 w-full"><Link to="/app">Entrar a mi cuenta<ArrowRight size={16} /></Link></Button></div>;
  return <div className="mt-8 w-full max-w-sm space-y-3">
    <h2 className="mb-4 font-display text-lg font-semibold">{signup ? "Crea tu cuenta" : "Entra a tu cuenta"}</h2>
    <Button disabled={!session.ready} className="h-12 w-full" onClick={() => session.login("email")}>{signup ? "Registrarme con email" : "Entrar con email"}<ArrowRight size={16} /></Button>
    <Button disabled={!session.ready} variant="secondary" className="h-12 w-full" onClick={() => session.login("google")}>Continuar con Google</Button>
    <Button disabled={!session.ready} variant="outline" className="h-12 w-full" onClick={() => session.login("wallet")}><Wallet size={16} />Phantom / Jupiter Wallet</Button>
    <Button variant="link" className="w-full" onClick={() => setSignup(!signup)}>{signup ? "Ya tengo cuenta · Iniciar sesión" : "¿Eres nuevo? Crear cuenta"}</Button>
    {signup && <p className="text-xs leading-5 text-muted-foreground">Tu primer acceso crea tu cuenta con Privy. Después puedes elegir tu nombre y avatar.</p>}
    {session.error && <p role="alert" className="text-sm text-destructive">{session.error}</p>}
    <p className="pt-2 text-xs leading-5 text-muted-foreground">Al continuar, aceptas los <Link className="underline" to="/terminos">términos</Link> y conoces la <Link className="underline" to="/privacidad">política de privacidad</Link>. Entrar no mueve tus monedas.</p>
  </div>;
}
export function EntryAccess() {
  return <ClientOnly fallback={<p className="mt-8 text-sm text-muted-foreground">Preparando acceso…</p>}><Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">Preparando acceso…</p>}><PrivyAccess><EntryButtons /></PrivyAccess></Suspense></ClientOnly>;
}