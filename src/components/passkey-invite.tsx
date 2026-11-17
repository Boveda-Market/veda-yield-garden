import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";
import { rememberPasskey } from "@/lib/passkey-device";

const LATER = "boveda:passkey-later";

/** Invites signed-in people without Face ID / fingerprint to turn it on, right in Mi Billetera, when the device supports it. */
export function PasskeyInvite() {
  const t = useT();
  const security = useBovedaSession().security;
  const [supported, setSupported] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [done, setDone] = useState(false);
  useEffect(() => {
    try { setHidden(sessionStorage.getItem(LATER) === "1"); } catch { setHidden(false); }
    const pkc = (window as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential;
    void pkc?.isUserVerifyingPlatformAuthenticatorAvailable?.().then(setSupported).catch(() => setSupported(false));
  }, []);
  const count = security?.passkeyCount ?? 0;
  // Success only when Face ID was added during this visit (0 → 1), never for people who already had it.
  useEffect(() => { if (count > 0) rememberPasskey(); }, [count]);
  const sawNone = useRef(false);
  useEffect(() => { if (count === 0) sawNone.current = true; else if (sawNone.current) setDone(true); }, [count]);
  if (!security || !supported || !security.hasEmbeddedWallet) return null;
  if (count > 0 && !done) return null;
  if (count > 0) return <p role="status" className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-primary animate-in fade-in"><CheckCircle2 size={18} />{t("¡Listo! La próxima vez entras con tu huella o Face ID.")}</p>;
  if (hidden) return null;
  return <section aria-label={t("Seguridad biométrica")} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">🛡️ {t("Seguridad biométrica")}</p>
    <p className="mt-1 font-display text-lg font-semibold">{t("Activa Face ID o huella digital")}</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Entra a tu billetera en un segundo, sin contraseñas. Protegido por tu propio dispositivo.")}</p>
    <Button className="mt-3 w-full" onClick={() => security.linkPasskey()}><Fingerprint size={18} />{t("Activar Face ID / huella")}</Button>
    <button type="button" onClick={() => { setHidden(true); try { sessionStorage.setItem(LATER, "1"); } catch { /* ignore */ } }} className="mt-2 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline">{t("Ahora no")}</button>
  </section>;
}
