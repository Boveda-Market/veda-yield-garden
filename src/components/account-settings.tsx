import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Leaf, Sun, Gem, Waves, Vault, Shield, Zap, Flame, Star, Diamond, Crown, Lock, Camera, Trash2, EyeOff, Eye, Home, BookUser, Plus, Check, LogOut, Copy, Wallet, Gift, UserRound, Scale, ChevronRight, ShieldCheck, Languages, Bell } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Button } from "./ui/button";
import { AVATAR_MIN_TIER, PHOTO_MAX_CHARS, defaultProfile, profileSchema, type AccountProfile } from "@/lib/account-profile";
import { HOME_OPTIONS, useContacts, useHideBalances, useHomePath, validContact, type HomePath } from "@/lib/preferences";
import { FEE_TIERS } from "@/lib/fees";
import { getAccountProfile, saveAccountProfile } from "@/lib/account-profile.functions";
import { LanguageMenu } from "./language-menu";
import { ThemeToggle } from "./theme-toggle";
import { TierBadge, TierCard } from "./tier-badge";
import { useAccountTier } from "@/hooks/use-account-tier";

const avatars = [{ id: "leaf", label: "Hoja", Icon: Leaf }, { id: "sun", label: "Sol", Icon: Sun }, { id: "gem", label: "Gema", Icon: Gem }, { id: "waves", label: "Olas", Icon: Waves }, { id: "vault", label: "Bóveda", Icon: Vault }, { id: "shield", label: "Escudo", Icon: Shield }, { id: "zap", label: "Rayo", Icon: Zap }, { id: "flame", label: "Fénix", Icon: Flame }, { id: "star", label: "Estrella Plus", Icon: Star }, { id: "diamond", label: "Diamante Pro", Icon: Diamond }, { id: "crown", label: "Corona VIP", Icon: Crown }] as const;
const homeLabels: Record<HomePath, string> = { "/wallet": "Mi Billetera", "/portfolio": "Portafolio", "/app": "Bóvedas" };

/** Center-crops and compresses a picked image to a small square WebP data URL in the browser. */
async function toAvatarPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256);
  for (const q of [0.85, 0.7, 0.5]) { let url = canvas.toDataURL("image/webp", q); if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/jpeg", q); if (url.length <= PHOTO_MAX_CHARS) return url; }
  throw new Error("too-big");
}
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
  const tierIndex = tier?.index ?? 0;
  const [hidden, setHidden] = useHideBalances();
  const [home, setHome] = useHomePath();
  const [contacts, setContacts] = useContacts();
  const [contact, setContact] = useState({ name: "", address: "" });
  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage(t("Elige una imagen (JPG, PNG o HEIC).")); return; }
    try { setProfile({ ...profile, photo: await toAvatarPhoto(file) }); setMessage(t("Foto lista. Toca «Guardar cambios».")); }
    catch { setMessage(t("No se pudo usar esa imagen. Prueba con otra.")); }
  }
  const copy = () => { if (!wallet) return; void navigator.clipboard.writeText(wallet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  return <section className="mx-auto max-w-3xl space-y-6 py-8">
    <h1 className="font-display text-3xl font-semibold">{t("Tu cuenta")}</h1>

    <div className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center`}>
      <label className="group relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-primary/10 text-primary ring-4 ring-primary/20" title={t("Cambiar foto")}>
        {profile.photo ? <img src={profile.photo} alt={t("Tu foto de perfil")} className="size-full object-cover" /> : <AvatarIcon size={36} />}
        <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-background/80 py-0.5"><Camera size={14} /></span>
        <input type="file" accept="image/*" className="sr-only" aria-label={t("Subir foto de perfil")} onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
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
        <Button asChild variant="outline" size="sm"><Link to="/wallet"><Wallet size={16} />{t("Mi Billetera")}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link to="/invita"><Gift size={16} />{t("Invita y gana")}</Link></Button>
      </div>
    </div>

    <TierCard wallet={wallet} />

    <div className={card}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><UserRound size={20} className="text-primary" />{t("Perfil")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("Hazla tuya. Tu nombre, foto y avatar son opcionales.")}</p>
      <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="block text-sm">{t("Nombre para mostrar")}<input maxLength={60} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder={t("¿Cómo te llamas?")} className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" /></label>
        <div className="space-y-2"><p className="text-sm">{t("Foto de perfil")}</p><div className="flex flex-wrap gap-2">
          <Button asChild type="button" variant="outline" size="sm"><label className="cursor-pointer"><Camera size={16} />{profile.photo ? t("Cambiar foto") : t("Subir foto")}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label></Button>
          {profile.photo && <Button type="button" variant="ghost" size="sm" onClick={() => setProfile({ ...profile, photo: "" })}><Trash2 size={16} />{t("Quitar foto")}</Button>}
        </div><p className="text-xs text-muted-foreground">{t("Se recorta en círculo y se reduce automáticamente. Si no subes una, se usa tu icono.")}</p></div>
        <fieldset><legend className="mb-3 text-sm">{t("Elige tu avatar")}</legend><div className="flex flex-wrap gap-3">{avatars.map(({ id, label, Icon }) => { const min = AVATAR_MIN_TIER[id]; const locked = tierIndex < min; return <Button key={id} type="button" disabled={locked} variant={profile.avatar === id ? "default" : "outline"} size="icon" className="relative" title={locked ? t("Se desbloquea en nivel {tier}", { tier: FEE_TIERS[min]?.name ?? "" }) : t(label)} aria-label={t(label)} aria-pressed={profile.avatar === id} onClick={() => setProfile({ ...profile, avatar: id })}><Icon size={22} />{locked && <Lock size={10} className="absolute -right-1 -top-1 rounded-full bg-card" />}</Button>; })}</div><p className="mt-2 text-xs text-muted-foreground">{t("Los iconos con candado se desbloquean al subir de nivel (Plus, Pro y VIP).")}</p></fieldset>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><Languages size={16} />{t("Idioma")}</span><LanguageMenu /></div>
        <div className="flex items-center justify-between gap-3 text-sm"><span>{t("Apariencia")}</span><ThemeToggle /></div>
        <Button type="submit" disabled={busy}><Check size={16} />{busy ? t("Un momento…") : t("Guardar cambios")}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      </form>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("Tu foto y avatar no verifican tu identidad ni autorizan movimientos. Nunca te pediremos tu frase semilla.")}</p>
    </div>

    <div className={card}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Home size={20} className="text-primary" />{t("Preferencias")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("Se guardan en este dispositivo.")}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2">{hidden ? <EyeOff size={16} /> : <Eye size={16} />}{t("Ocultar saldos")}</span><button type="button" role="switch" aria-checked={hidden} aria-label={t("Ocultar saldos")} onClick={() => setHidden(!hidden)} className={`relative h-6 w-11 rounded-full transition-colors ${hidden ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-all ${hidden ? "left-[22px]" : "left-0.5"}`} /></button></div>
      <p className="mt-1 text-xs text-muted-foreground">{t("Muestra $•••• en lugar de tus montos, ideal en lugares públicos.")}</p>
      <div className="mt-4 text-sm"><p>{t("Pantalla al entrar")}</p><div className="mt-2 grid grid-cols-3 gap-2">{HOME_OPTIONS.map((h) => <Button key={h} type="button" size="sm" variant={home === h ? "default" : "outline"} aria-pressed={home === h} onClick={() => setHome(h)}>{t(homeLabels[h])}</Button>)}</div></div>
    </div>

    <div className={card}>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><BookUser size={20} className="text-primary" />{t("Contactos de confianza")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("Guarda direcciones con un nombre para enviar sin copiar 44 caracteres. Se guardan solo en este dispositivo; revisa siempre la dirección antes de aprobar.")}</p>
      {contacts.length > 0 && <ul className="mt-3 divide-y divide-border">{contacts.map((c, i) => <li key={`${c.address}-${i}`} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0"><span className="font-medium">{c.name}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{c.address.slice(0, 4)}…{c.address.slice(-4)}</span></span><Button type="button" variant="ghost" size="icon" aria-label={t("Eliminar contacto")} onClick={() => setContacts(contacts.filter((_, k) => k !== i))}><Trash2 size={16} /></Button></li>)}</ul>}
      <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); const c = { name: contact.name.trim(), address: contact.address.trim() }; if (!validContact(c)) { setMessage(t("Revisa el nombre y la dirección del contacto.")); return; } setContacts([...contacts.filter((x) => x.address !== c.address), c]); setContact({ name: "", address: "" }); }}>
        <input maxLength={40} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder={t("Nombre (ej. Mi Coinbase)")} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <input value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} placeholder={t("Dirección de la wallet")} className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" />
        <Button type="submit" size="sm"><Plus size={16} />{t("Añadir")}</Button>
      </form>
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
      <p className="mt-3 text-xs text-muted-foreground">Boveda Technologies</p>
    </div>

    <Button variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void (async () => { await session.logout(); window.location.assign("/"); })()}><LogOut size={16} />{t("Cerrar sesión")}</Button>
  </section>;
}
