import { BrandLogo } from "@/components/brand-logo";
import { langLinks } from "@/lib/seo-lang";
import sharePreview from "@/assets/share/boveda_gta6_preview_es.jpg.asset.json";
import shareVideo from "@/assets/share/og-preview-gta6.mp4.asset.json";
import dobleLogo from "@/assets/doble-o-nada-logo.png";
import { HERO_VARIANTS, HERO_KEY, pickHeroVariant, isHeroReview } from "@/lib/hero-variants";
import { Fingerprint, Landmark } from "lucide-react";
import reviewCarlos from "@/assets/review-carlos.jpg";
import reviewValeria from "@/assets/review-valeria.jpg";
import reviewDavid from "@/assets/review-david.jpg";
import reviewMarisol from "@/assets/review-marisol.jpg";
import { Lock, Gift, Search, Star, Quote, MessageSquare, Send, Activity } from "lucide-react";
import { useT } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { isReturning } from "@/lib/preferences";
import { EntryAccess } from "@/components/entry-access";
import { PredictPromo } from "@/components/predict-promo";
import { DobleHero, Gta6Hero, HomeCtas } from "@/components/home-gta6";
import { BootSplash } from "@/components/boot-splash";

/** Before hydration, returning visitors (flag set by a tiny head script) see the loading screen instead of the full page flashing. */
function ReturningCover() {
  return <div className="boveda-returning-cover"><BootSplash /></div>;
}

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "BÓVEDA — Billetera en dólares digitales (USDC) que genera intereses" },
    { name: "description", content: "Guarda dólares digitales (USDC), genera intereses y retira a tu banco o Cash App. Solo tú apruebas cada movimiento con tu huella o Face ID. Depositar es gratis." },
    { property: "og:title", content: "BÓVEDA — Billetera en dólares digitales (USDC) que genera intereses" },
    { property: "og:description", content: "Guarda dólares digitales (USDC), genera intereses y retira a tu banco o Cash App. Solo tú apruebas cada movimiento con tu huella o Face ID. Depositar es gratis." },
    { property: "og:locale", content: "es_ES" }, { property: "og:locale:alternate", content: "en_US" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: `https://bovedamarket.app${sharePreview.url}` }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:image:alt", content: "Bóveda GTA6 — Mientras todos esperan el juego, tú cobras como la casa." }, { name: "twitter:image", content: `https://bovedamarket.app${sharePreview.url}` }, { property: "og:video", content: `https://bovedamarket.app${shareVideo.url}` }, { property: "og:video:secure_url", content: `https://bovedamarket.app${shareVideo.url}` }, { property: "og:video:type", content: "video/mp4" }, { property: "og:video:width", content: "1200" }, { property: "og:video:height", content: "630" },
    { property: "og:url", content: "https://bovedamarket.app/" },
  ], links: langLinks("es", "/", "/en"),
  scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"BÓVEDA","url":"https://bovedamarket.app/","logo":"https://bovedamarket.app/favicon.png","email":"admin@bovedamarket.app"},{"@type":"WebApplication","name":"BÓVEDA","url":"https://bovedamarket.app/","applicationCategory":"FinanceApplication","operatingSystem":"Web","inLanguage":"es","description":"Guarda dólares digitales (USDC), genera intereses y retira a tu banco o Cash App. Solo tú apruebas cada movimiento con tu huella o Face ID. Depositar es gratis.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}]}) }] }), component: Landing,
});

const FAQS = [
  { q: "¿Qué es USDC?", a: "USDC es una moneda digital diseñada para mantener el mismo valor que el dólar estadounidense: 1 USDC busca valer 1 USD. En BÓVEDA tus saldos, depósitos y intereses se muestran en USDC. No es un depósito bancario ni está asegurado." },
  { q: "¿Necesito dinero para usar BÓVEDA?", a: "No para mirar. Puedes ver las bóvedas y Doble o Nada en vivo sin registrarte. Para jugar o depositar, entras con Google o email y añades dólares con tu tarjeta. Puedes empezar con poco." },
  { q: "¿Cómo se generan las ganancias?", a: "Tu depósito se suma a una bóveda que cobra intereses cada vez que otras personas cambian monedas en ella. Esos intereses se reparten entre quienes aportan. Las tasas son estimaciones, cambian y puedes perder dinero." },
  { q: "¿Cuándo puedo retirar?", a: "Puedes cosechar tus ganancias o cerrar tu posición cuando quieras, sin plazos de permanencia. Cada operación se revisa antes de firmar con tu wallet." },
  { q: "¿Cuánto cuesta usar BÓVEDA?", a: "Depositar, enviar, cambiar monedas y entrar a Sube/Baja es gratis. Cosechar, cerrar, retirar y reclamar premios tienen un pequeño cargo de servicio que siempre ves antes de firmar. El detalle está en Términos y condiciones." },
];

const GUARANTEES = [
  { icon: ShieldCheck, title: "Control y firma propia", body: "Cada operación requiere tu autorización. BÓVEDA nunca mueve tus fondos sin tu firma." },
  { icon: Landmark, title: "Sin dinero congelado", body: "Sin plazos de permanencia. Sales de tus predicciones o bóvedas cuando tú decidas." },
  { icon: Lock, title: "Seguridad moderna", body: "Entra con huella, Face ID o email cifrado, sin frases secretas escritas en papel." },
];


const ANTI_SCAM: [string, string][] = [
  ["Nadie custodia tu dinero", "En una estafa entregas tus fondos a alguien. En BÓVEDA tu saldo vive en tu propia wallet: nosotros no podemos tocarlo."],
  ["Sin «tarifas para descongelar»", "Nunca te pediremos pagar para poder retirar. Retiras a Coinbase, tu banco o Cash App cuando tú decidas."],
  ["Sin contraseñas que te puedan robar", "Entra con Google (recomendado) o tu huella: tu acceso queda protegido por la verificación en 2 pasos y tu dispositivo. Nunca te pediremos contraseñas ni frases secretas."],
  ["Cero firmas a ciegas", "Cada operación se simula antes de firmar: ves qué sale, qué entra y el cargo exacto. Así te proteges de hackers."],
];

const REVIEWS = [
  { stars: 5, name: "Carlos M.", photo: reviewCarlos, title: "Retiré a Coinbase en minutos sin pedir permiso", tag: "Acceso con Google · Bóvedas", text: "Perdí dinero en plataformas que prometían 20% mensual y luego bloquearon los retiros. Aquí mi dinero está en mi wallet y retiré a Coinbase en minutos sin pedir permiso." },
  { stars: 4, name: "Valeria R.", photo: reviewValeria, title: "Paz mental al revisar cada firma", tag: "Acceso con Google · Hace 2 semanas", text: "La revisión antes de firmar me da paz. Le doy 4 porque a veces la red tarda unos segundos más, pero saber que nadie toca mis USDC vale la pena." },
  { stars: 3, name: "David S.", photo: reviewDavid, title: "Sin humo: empieza con poco", tag: "Acceso con huella · Sube o Baja", text: "Perdí mi primera ronda de Sube o Baja por no entender los tiempos. Me gusta que no venden humo: recomiendo mirar unas rondas en vivo y empezar con poco." },
  { stars: 5, name: "Marisol T.", photo: reviewMarisol, title: "Un equipo que sí responde", tag: "Canal de Telegram · Mi Billetera", text: "Envié una sugerencia y el equipo me respondió rápido. Las notificaciones me avisan de cada cosecha y del estado del sistema en Telegram: siento que hay personas reales detrás." },
];

function TrustTicker() {
  const t = useT();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused) return; const id = setInterval(() => setI((n) => (n + 1) % REVIEWS.length), 4500); return () => clearInterval(id); }, [paused]);
  const r = REVIEWS[i] ?? REVIEWS[0]!;
  return <a href="#opiniones" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="mx-auto mt-4 flex w-full min-w-0 max-w-full sm:max-w-md items-center gap-3 rounded-full border border-primary/30 bg-primary/5 py-1.5 pl-1.5 pr-4 text-left md:mx-0" aria-label={t("Lo que dice la comunidad")}>
    <span className="flex shrink-0 -space-x-2">{REVIEWS.map((x, n) => <img key={x.name} src={x.photo} alt="" width={28} height={28} className={`h-7 w-7 rounded-full border-2 object-cover transition-transform duration-500 ${n === i ? "z-10 scale-110 border-primary" : "border-background"}`} />)}</span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground"><span className="flex text-primary">{[1,2,3,4,5].map((n) => <Star key={n} size={10} className="fill-current" />)}</span>4.8 / 5</span>
      <span key={i} className="block truncate text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-500">{`«${t(r.title)}» — ${r.name}`}</span>
    </span>
  </a>;
}

const TRUST = [
  { icon: Fingerprint, title: "Tus fondos, tu control", body: "Wallet de autocustodia con Face ID o huella, protegida por Privy. Nadie mueve tu dinero sin tu aprobación digital." },
  { icon: Landmark, title: "1 USDC = $1 siempre", body: "Nada de monedas locas que hoy suben y mañana se desploman. Tu saldo se mantiene estable mientras genera intereses reales." },
  { icon: Search, title: "Revisas antes de aprobar", body: "Cada operación se simula primero: ves exactamente qué entra, qué sale y el cargo." },
  { icon: ShieldCheck, title: "Sin cargos ocultos", body: "Recargas y retiros con Coinbase. Cargos de servicio reducidos y progresivos." },
];

export function Landing() {
  const t = useT();
  const [compact, setCompact] = useState(false);
  const [decided, setDecided] = useState(false);
  useEffect(() => { setCompact(isReturning() && !isHeroReview()); setDecided(true); void import("@/components/privy-access").catch(() => {}); }, []);
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(HERO_KEY); } catch { /* blocked storage */ }
    const i = pickHeroVariant(new URLSearchParams(window.location.search).get("v"), saved, Math.random());
    setHeroIdx(i);
    try { localStorage.setItem(HERO_KEY, String(i)); } catch { /* blocked storage */ }
  }, []);
  const hero = HERO_VARIANTS[heroIdx] ?? HERO_VARIANTS[0]!;
  const gtaHero = hero.theme === "gta6";
  const dobleHero = hero.theme === "doble";
  const plainHero = !gtaHero && !dobleHero;
  if (decided && compact) return <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-10 pt-20 text-foreground sm:py-10">
    <BrandLogo size="lg" />
    <h1 className="mt-4 text-center font-display text-3xl font-bold">{t("Bienvenido de nuevo")}</h1>
    <p className="mt-2 text-center text-sm text-muted-foreground">{t("Entra para ver tu wallet y tus ganancias.")}</p>
    <div className="mt-2 flex w-full max-w-sm flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0"><EntryAccess /></div>
    <button type="button" onClick={() => setCompact(false)} className="mt-6 text-sm text-primary underline underline-offset-4">{t("Ver portada completa")}</button>
  </div>;
  return <div className="min-h-screen bg-background text-foreground">
    {!decided && <ReturningCover />}
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 pb-4 pt-14 sm:px-6 sm:py-6"><Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 font-display text-lg font-bold sm:gap-3"><BrandLogo /></Link><div className="flex min-w-0 items-center gap-1.5 sm:gap-2"></div></header>
    <main className="mx-auto max-w-5xl px-6">
      <section className="grid items-center gap-6 pb-12 pt-2 md:grid-cols-2 md:gap-10 md:pt-12">
        {gtaHero && <div className="order-1 min-w-0 md:col-span-2"><Gta6Hero title={hero.title} sub={hero.sub} /></div>}
        {dobleHero && <div className="order-1 min-w-0 md:col-span-2"><DobleHero title={hero.title} sub={hero.sub} /></div>}
        {plainHero && <div className="order-1 min-w-0 text-center md:hidden"><h1 className="font-display text-3xl font-bold leading-tight">{t(hero.title)}</h1><p className="mt-2 font-display text-base font-semibold text-primary">{t(hero.sub)}</p><TrustTicker /></div>}
        <div className="order-3 min-w-0 text-center md:order-1 md:text-left">
          {plainHero && <h1 className="hidden font-display text-4xl font-bold leading-tight sm:text-5xl md:block">{t(hero.title)}</h1>}
          {plainHero && <><p className="mt-3 hidden font-display text-xl font-semibold text-primary md:block">{t(hero.sub)}</p><div className="hidden md:block"><TrustTicker /></div></>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground md:justify-start"><span className="flex items-center gap-1.5"><span>Powered by</span><img src="/brands/coinbase.svg" alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-medium text-foreground">Coinbase</span></span><span className="flex items-center gap-1.5"><span>Network:</span><span className="flex items-center gap-1 font-semibold text-primary"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" /></span>{t("Online")}</span></span></div>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{t("Tu dinero, tus reglas. BÓVEDA blinda tu capital con seguridad criptográfica: nadie puede congelar tus fondos y cada centavo se mueve únicamente con tu huella o Face ID.")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs md:justify-start">
            {["$0 por depositar", "Sin plazos forzosos", "Retiras cuando quieras", "Mira en vivo sin registrarte"].map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><ShieldCheck size={13} className="text-primary" />{t(b)}</li>)}
          </ul>
        </div>
        <div id="acceso" className="order-2 min-w-0 scroll-mt-4 flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0">
          <HomeCtas vaultsFirst={gtaHero} />
          <EntryAccess />
          <p className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground"><Lock size={11} aria-hidden="true" /><span>Secured by</span><img src="/brands/privy-mark.png" alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">Privy</span><span aria-hidden="true">·</span><a href="https://www.privy.io/security" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">{t("Conoce más")} ↗</a></p>
        </div>
      </section>

      <section aria-label={t("Doble o Nada")} className="mb-4 grid items-center gap-6 py-8 md:grid-cols-2">
        <div className="text-center md:text-left"><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} loading="lazy" className="mx-auto h-16 w-auto md:mx-0 sm:h-20" /><p className="mt-1 text-xs font-bold uppercase tracking-widest text-primary">{t("Rondas relámpago")}</p><h2 className="mt-2 font-display text-3xl font-bold">{t("Haz dinero en minutos prediciendo el mercado.")}</h2><p className="mt-3 text-muted-foreground">{t("Bitcoin, Ethereum y Solana en rondas relámpago, sin comprar la moneda: juegas en dólares. Si aciertas el movimiento, cobras el premio al instante.")}</p><Link to="/guias/mercados-de-prediccion" className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4">{t("¿Cómo funciona? Lee la guía")} →</Link></div>
        <PredictPromo />
      </section>
      <section id="opiniones" className="scroll-mt-4 py-12">
        <h2 className="font-display text-2xl font-bold">{t("Lo que dice la comunidad")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{REVIEWS.map(({ stars, name, text, photo, title, tag }) => <li key={name} className={`relative flex flex-col rounded-2xl border bg-card p-5 ${stars === 5 ? "border-primary/40 bg-gradient-to-br from-primary/10 to-card" : "border-border"}`}>
          <Quote aria-hidden="true" size={28} className="absolute right-4 top-4 text-primary/15" />
          <div className="flex items-center gap-3"><img src={photo} alt="" loading="lazy" width={48} height={48} className="h-12 w-12 rounded-full border-2 border-primary/30 object-cover" />
            <div className="min-w-0"><p className="text-sm font-semibold">{name}</p><p className="truncate text-xs text-muted-foreground">{t(tag)}</p></div></div>
          <div className="mt-3 flex gap-0.5 text-primary" aria-label={`${stars}/5`}>{[1,2,3,4,5].map((n) => <Star key={n} size={15} className={n <= stars ? "fill-current" : "text-muted-foreground/40"} />)}</div>
          <p className="mt-2 font-display font-semibold leading-snug">{t(title)}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">“{t(text)}”</p></li>)}</ul>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 font-display font-semibold"><MessageSquare size={16} className="text-primary" />{t("¿Qué te gusta y qué no? Cuéntanos")}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{t("Envía sugerencias, críticas o tu reseña. Leemos cada mensaje para mejorar BÓVEDA.")}</p></div>
          <Button asChild variant="outline" className="shrink-0"><a href="#acceso" onClick={() => { try { sessionStorage.setItem("boveda:open-ideas", "1"); } catch { /* ignore */ } }}>{t("Entrar y opinar")}</a></Button>
        </div>
      </section>

      <section aria-label={t("Seguridad")} className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-border bg-card p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={16} /></span><p className="mt-3 font-display text-sm font-semibold">{t(title)}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(body)}</p></div>)}
      </section>

      <section aria-label={t("Por qué BÓVEDA es diferente")} className="mb-12 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("¿Te estafaron antes?")}</p>
        <h2 className="mt-2 font-display text-2xl font-bold">{t("Aquí no le entregas tu dinero a nadie")}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">{ANTI_SCAM.map(([h, d]) => <li key={h} className="rounded-2xl border border-border bg-background p-4"><p className="font-display text-sm font-semibold">{t(h)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(d)}</p></li>)}</ul>
      </section>

      <section id="transparencia" className="mb-12 scroll-mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Send size={14} />{t("Canal oficial de Telegram")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{t("Transparencia total, en vivo")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("Únete a @bovedamarket: recibe alertas automáticas del estado de la red y de la app, avisos de seguridad y cada mejora en cuanto sale.")}</p>
            <p className="mt-4 flex max-w-xl items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span>{t("Nadie de BÓVEDA te escribirá primero por privado. Nunca te pediremos claves, frases de recuperación, códigos ni dinero para retirar. Si alguien lo hace, es una estafa.")}</span></p></div>
          <div className="flex shrink-0 flex-col gap-2"><Button asChild className="h-12"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer">{t("Unirme a @bovedamarket")}<ArrowRight size={16} /></a></Button><Link to="/status" search={{ from: "transparencia" }} className="flex items-center justify-center gap-1.5 text-sm text-primary underline"><Activity size={14} />{t("Ver estado del sistema")}</Link></div>
        </div>
      </section>

      <section className="border-t border-border py-12">
        <h2 className="font-display text-2xl font-bold">{t("Tu tranquilidad en BÓVEDA")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">{GUARANTEES.map(({ icon: Icon, title, body }) => <li key={title} className="rounded-2xl border border-border bg-card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={18} /></span>
          <p className="mt-4 font-display font-semibold">{t(title)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ul>
      </section>

      <section className="py-12">
        <div className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Gift size={20} /></span>
          <h2 className="mt-4 font-display text-2xl font-bold">{t("Invita y gana: genera más compartiendo BÓVEDA")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Cualquier usuario puede ser socio. Comparte tu enlace y recibe en USDC una parte de las ganancias de cada operación de tus invitados, sin costo extra para ellos.")}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">50%</p><p className="text-sm text-muted-foreground">{t("de las ganancias de tus invitados directos")}</p></li>
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">10%</p><p className="text-sm text-muted-foreground">{t("de los invitados de tus invitados")}</p></li>
          </ul>
          <Button asChild className="mt-5"><Link to="/invita">{t("Obtener mi enlace")}<ArrowRight size={16} /></Link></Button>
        </div>
      </section>

      <section className="py-12">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
        {FAQS.map(({ q, a }) => <details key={q} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium [&::-webkit-details-marker]:hidden"><span>{t(q)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <p className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(a)}</p>
        </details>)}
      </section>
    </main>
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to="/guias">Guías</Link><Link to="/status">{t("Estado del sistema")}</Link><Link to="/terminos">{t("Términos")}</Link><Link to="/privacidad">{t("Privacidad")}</Link></nav><p className="mt-4 text-center"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("Soporte en Telegram")}</a>{" · "}<a href="mailto:admin@bovedamarket.app" className="text-primary underline">admin@bovedamarket.app</a></p><p className="mt-2 text-center">© {new Date().getFullYear()} Boveda Technologies</p></footer>
  </div>;
}
