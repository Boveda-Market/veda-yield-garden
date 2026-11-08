import { useT } from "@/lib/i18n";
import { useState } from "react";
import { Fingerprint, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";

export function AccountSecuritySettings() {
  const t = useT();
  const session = useBovedaSession();
  const security = session.security;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session.authenticated || !security) return null;
  const mfaEnabled = security.enrolledMfa.length > 0;
  const canManageMfa = security.hasEmbeddedWallet && (security.availableMfa.length > 0 || mfaEnabled);
  async function manageMfa() {
    if (!security || !canManageMfa || busy) return;
    setBusy(true); setError("");
    try { await security.manageMfa(); }
    catch { setError(t("No se pudo abrir la doble verificación. Inténtalo de nuevo.")); }
    finally { setBusy(false); }
  }
  const methods = security.enrolledMfa.map(method => method === "totp" ? t("Autenticador") : method === "passkey" ? "Passkey" : "SMS");
  return <section aria-labelledby="account-security-title" className="mt-10 border-t border-border pt-8">
    <h2 id="account-security-title" className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck size={22} className="text-primary" />{t("Seguridad")}</h2>
    <div className="mt-4 divide-y divide-border">
      <div className="py-5">
        <h3 className="flex items-center gap-2 font-medium"><Mail size={18} />{t("Correo de acceso")}</h3>
        <p className="mt-2 break-all text-sm text-muted-foreground">{security.email ?? t("Aún no has vinculado un correo.")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Verifica tu correo con un código para entrar a tu cuenta. Es independiente del registro de novedades.")}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => security.email ? security.updateEmail() : security.linkEmail()}><Mail size={16} />{security.email ? t("Cambiar correo") : t("Vincular correo")}</Button>
      </div>
      <div className="py-5">
        <h3 className="flex items-center gap-2 font-medium"><Fingerprint size={18} />Passkeys</h3>
        <p className="mt-2 text-sm text-muted-foreground">{security.passkeyCount ? t(security.passkeyCount === 1 ? "{count} passkey vinculada" : "{count} passkeys vinculadas", { count: security.passkeyCount }) : t("Sin passkeys vinculadas")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Entra con la huella, el rostro o el PIN de tu dispositivo, sin contraseña. Necesitas un dispositivo y navegador compatibles.")}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => security.linkPasskey()}><Fingerprint size={16} />{t("Añadir passkey")}</Button>
      </div>
      <div className="py-5">
        <h3 className="flex items-center gap-2 font-medium"><Smartphone size={18} />{t("Doble verificación · 2FA")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{mfaEnabled ? t("Activada: {methods}", { methods: methods.join(", ") }) : t("No activada")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Protege las operaciones de la wallet creada en tu cuenta con una app autenticadora, como Google Authenticator, o los métodos disponibles. No añade un segundo paso al inicio de sesión.")}</p>
        {!security.hasEmbeddedWallet && <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Si usas Phantom o Jupiter Wallet, administra su seguridad directamente allí. Esta opción no protege las firmas de wallets externas.")}</p>}
        {security.hasEmbeddedWallet && !canManageMfa && <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("La doble verificación todavía no está habilitada para esta aplicación.")}</p>}
        <Button type="button" variant="outline" className="mt-3" disabled={!canManageMfa || busy} onClick={() => void manageMfa()}><ShieldCheck size={16} />{busy ? t("Un momento…") : mfaEnabled ? t("Administrar 2FA") : t("Configurar 2FA")}</Button>
      </div>
    </div>
    {(error || security.message) && <p role={error ? "alert" : "status"} className="mt-3 text-sm text-muted-foreground">{error || security.message}</p>}
  </section>;
}