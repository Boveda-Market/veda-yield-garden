import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Leaf, Sun, Gem, Waves, Check, LogOut, Copy, Wallet, Gift, UserRound, Scale, ChevronRight, ShieldCheck, Languages, Bell } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";
import { defaultProfile, profileSchema, type AccountProfile } from "@/lib/account-profile";
import { getAccountProfile, saveAccountProfile } from "@/lib/account-profile.functions";
import { LanguageMenu } from "./language-menu";
import { TierBadge, TierCard } from "./tier-badge";
import { useAccountTier } from "@/hooks/use-account-tier";

const avatars = [{ id: "leaf", label: "Hoja", Icon: Leaf }, { id: "sun", label: "Sol", Icon: Sun }, { id: "gem", label: "Gema", Icon: Gem }, { id: "waves", label: "Olas", Icon: Waves }] as const;
const card = "rounded-2xl border border-border bg-card p-6";

export function AccountSettings() {
  const t = useT();
  const session = useBovedaSession();
  const load = useServerFn(getAccountProfile);
  const save = useServerFn(saveAccountProfile);
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);
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
  const AvatarIcon = avatars.find(a => a.id === profile.avatar)?.Icon ?? UserRound;
  const wallet = session.walletAddress;
  const tier = useAccountTier(wallet);
  const copy = () => { if (!wallet) return; void navigator.clipboard.writeText(wallet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  return <section className="mx-auto max-w-3xl space-y-6 py-8">
    <h1 className="font-display text-3xl font-semibold">{t("Tu cuenta")}</h1>

    <div className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center`}>
      <div className="grid size-20 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/20"><AvatarIcon size={36} /></div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-2xl font-semibold">{profile.displayName || t("Tu perfil")}</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{session.label}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><ShieldCheck size={14} />{t("Cuenta activa")}</span>
          {tier && <TierBadge index={tier.index} name={tier.name} />}
          {wallet && <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-mono text-xs hover:bg-muted" aria-label={t("Copiar dirección")}>{wallet.slice(0, 4)}…{wallet.slice(-4)}{copied ? <Check size={12} /> : <Copy size={12} />}</button>}
        </div>
      </div>
      <div className="flex gap-2 sm:flex-col">
        <Button asChild variant="outline" size="sm"><Link to="/wallet"><Wallet size={16} />{t("Mi wallet")}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/invita"><Gift size={16} />{t("Invita y gana")}</Link></Button>
      </div>
    </div>

    <TierCard wallet={wallet} />

    <div className={card}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><UserRound size={20} className="text-primary" />{t("Perfil")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("Hazla tuya. Tu nombre y avatar son opcionales.")}</p>
      <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="block text-sm">{t("Nombre para mostrar")}<input maxLength={60} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder={t("¿Cómo te llamas?")} className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" /></label>
        <fieldset><legend className="mb-3 text-sm">{t("Elige tu avatar")}</legend><div className="flex gap-3">{avatars.map(({ id, label, Icon }) => <Button key={id} type="button" variant={profile.avatar === id ? "default" : "outline"} size="icon" title={t(label)} aria-label={t(label)} aria-pressed={profile.avatar === id} onClick={() => setProfile({ ...profile, avatar: id })}><Icon size={22} /></Button>)}</div></fieldset>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Languages size={16} />{t("Idioma")}</span><LanguageMenu /></div>
        <Button type="submit" disabled={busy}><Check size={16} />{busy ? t("Un momento…") : t("Guardar cambios")}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      </form>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("Tu avatar no verifica tu identidad ni autoriza movimientos. Nunca te pediremos tu frase semilla.")}</p>
    </div>

    <div className={card}>
      <ul className="divide-y divide-border">
        <li><Link to="/seguridad" className="flex items-center justify-between py-3 text-sm hover:text-primary"><span className="flex items-center gap-2"><ShieldCheck size={18} className="text-primary" />{t("Seguridad")}</span><ChevronRight size={16} /></Link></li>
        <li><Link to="/notificaciones" className="flex items-center justify-between py-3 text-sm hover:text-primary"><span className="flex items-center gap-2"><Bell size={18} className="text-primary" />{t("Notificaciones")}</span><ChevronRight size={16} /></Link></li>
      </ul>
    </div>

    <div className={card}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Scale size={20} className="text-primary" />{t("Legal y ayuda")}</h2>
      <ul className="mt-3 divide-y divide-border">
        {([["/terminos", "Términos y condiciones"], ["/privacidad", "Política de privacidad"], ["/faq", "Preguntas frecuentes"]] as const).map(([to, label]) => <li key={to}><Link to={to} className="flex items-center justify-between py-3 text-sm hover:text-primary">{t(label)}<ChevronRight size={16} /></Link></li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Boveda Technologies LLC</p>
    </div>

    <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void (async () => { await session.logout(); window.location.assign("/"); })()}><LogOut size={16} />{t("Cerrar sesión")}</Button>
  </section>;
}
