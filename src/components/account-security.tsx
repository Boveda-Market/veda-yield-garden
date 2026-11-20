import { useT } from "@/lib/i18n";
import { useState } from "react";
import { CheckCircle2, Fingerprint, Trash2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";

export function AccountSecuritySettings() {
  const t = useT();
  const session = useBovedaSession();
  const security = session.security;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
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
  async function removePasskeys() {
    if (!security?.unlinkPasskeys || busy) return;
    setBusy(true); setError("");
    try { await security.unlinkPasskeys(); setConfirming(false); }
    catch { setError(t("No se pudo desvincular la huella. Inténtalo de nuevo.")); }
    finally { setBusy(false); }
  }
  const methods = security.enrolledMfa.map(method => method === "totp" ? t("Autenticador") : method === "passkey" ? "Passkey" : "SMS");
  return <section aria-labelledby="account-security-title" className="mt-10 border-t border-border pt-8">
    <h2 id="account-security-title" className="flex items-center gap-2 font-display text-xl font-semibold"><ShieldCheck size={22} className="text-primary" />{t("Seguridad")}</h2>
    <div className="mt-4 divide-y divide-border">
      <div className="py-5">
        <h3 className="flex items-center gap-2 font-medium"><Mail size={18} />{t("Correo de acceso")}</h3>
        <p className="mt-2 break-all text-sm text-muted-foreground">{security.email ?? t("Aún no has vinculado un correo.")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Verifica tu correo con un código para entrar a tu cuenta.")}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => security.email ? security.updateEmail() : security.linkEmail()}><Mail size={16} />{security.email ? t("Cambiar correo") : t("Vincular correo")}</Button>
      </div>
      <div className="py-5">
        <h3 className="flex items-center gap-2 font-medium"><Fingerprint size={18} />{t("Acceso biométrico")}</h3>
        {security.passkeyCount ? <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary"><CheckCircle2 size={16} />{t("Vinculado")}</p> : <p className="mt-2 text-sm text-muted-foreground">{t("Sin huella ni Face ID configurado")}</p>}
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Entra con la huella, el rostro o el PIN de tu dispositivo, sin contraseña. Necesitas un dispositivo y navegador compatibles.")}</p>
        {security.passkeyCount === 0 && <Button type="button" variant="outline" className="mt-3" onClick={() => security.linkPasskey()}><Fingerprint size={16} />{t("Vincular huella o Face ID")}</Button>}
        {security.passkeyCount > 0 && (security.unlinkPasskeys
          ? (confirming
            ? <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"><p className="text-sm">{t("¿Desvincular tu huella o Face ID? Podrás volver a activarlo cuando quieras.")}</p><div className="mt-2 flex gap-2"><Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void removePasskeys()}>{busy ? t("Un momento…") : t("Sí, desvincular")}</Button><Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>{t("Cancelar")}</Button></div></div>
            : <Button type="button" variant="ghost" className="mt-3 text-destructive hover:text-destructive" onClick={() => setConfirming(true)}><Trash2 size={16} />{t("Desvincular huella")}</Button>)
          : <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Para desvincular la huella, primero vincula un correo o Google, así nunca pierdes el acceso a tu cuenta.")}</p>)}
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