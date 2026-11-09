import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Leaf, Sun, Gem, Waves, Check, LogOut } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";
import { defaultProfile, profileSchema, type AccountProfile } from "@/lib/account-profile";
import { getAccountProfile, saveAccountProfile } from "@/lib/account-profile.functions";
import { EmailSignup } from "./email-signup";
import { AffiliatePanel } from "./affiliate-panel";
import { BuyUsdc } from "./buy-usdc";
import { AccountSecuritySettings } from "./account-security";

const avatars = [{ id: "leaf", label: "Hoja", Icon: Leaf }, { id: "sun", label: "Sol", Icon: Sun }, { id: "gem", label: "Gema", Icon: Gem }, { id: "waves", label: "Olas", Icon: Waves }] as const;
export function AccountSettings() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAccountProfile);
  const save = useServerFn(saveAccountProfile);
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await session.getAccessToken?.();
        if (!token) throw new Error();
        const result = await load({ data: { token } });
        if (!active) return;
        if (result.success) setProfile(result.profile); else setMessage(t(result.error));
      } catch { if (active) setMessage(t("No se pudo cargar tu cuenta. Vuelve a iniciar sesión.")); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [session.userId]);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const parsed = profileSchema.safeParse(profile);
      if (!parsed.success) throw new Error(t("Usa un nombre de hasta 60 caracteres."));
      const token = await session.getAccessToken?.();
      if (!token) throw new Error(t("Inicia sesión para guardar tu cuenta."));
      const result = await save({ data: { token, profile: parsed.data } });
      setMessage(result.success ? t("Tu cuenta se actualizó.") : t(result.error));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("No se pudo guardar.")); }
    finally { setBusy(false); }
  }
  return <section className="max-w-lg py-8"><h1 className="font-display text-3xl font-semibold">{t("Tu cuenta")}</h1><p className="mt-3 text-muted-foreground">{t("Hazla tuya. Tu nombre y avatar son opcionales.")}</p>
    <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label className="block text-sm">{t("Nombre para mostrar")}<input maxLength={60} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder={t("¿Cómo te llamas?")} className="mt-2 w-full rounded-lg border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" /></label>
      <fieldset><legend className="mb-3 text-sm">{t("Elige tu avatar")}</legend><div className="flex gap-3">{avatars.map(({ id, label, Icon }) => <Button key={id} type="button" variant={profile.avatar === id ? "default" : "outline"} size="icon" title={t(label)} aria-label={t(label)} aria-pressed={profile.avatar === id} onClick={() => setProfile({ ...profile, avatar: id })}><Icon size={22} /></Button>)}</div></fieldset>
      <p className="break-all text-xs text-muted-foreground">{t("Acceso:")}{" "}{session.label}</p>
      <Button type="submit" disabled={busy}><Check size={16} />{busy ? t("Un momento…") : t("Guardar cambios")}</Button>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </form><p className="mt-8 text-xs leading-5 text-muted-foreground">{t("Tu avatar no verifica tu identidad ni autoriza movimientos. Nunca te pediremos tu frase semilla.")}</p>
    <AccountSecuritySettings />
    <AffiliatePanel />
    <BuyUsdc className="mt-8" />
    <EmailSignup />
    <Button variant="outline" className="mt-8 w-full" onClick={() => void (async () => { await session.logout(); window.location.assign("/"); })()}><LogOut size={16} />{t("Cerrar sesión")}</Button>
  </section>;
}