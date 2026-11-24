import { BrandLogo } from "@/components/brand-logo";
import { langLinks } from "@/lib/seo-lang";
import shareVideo from "@/assets/share/og-preview-bitcoin.mp4.asset.json";
import { shareMeta } from "@/lib/share-meta";
import dobleLogo from "@/assets/doble-o-nada-logo.png";
import { HERO_VARIANTS, HERO_KEY, pickHeroVariant, isHeroReview, legacyHeroRedirect } from "@/lib/hero-variants";
import { BitcoinHero, BitcoinSections, ClassicHero, TrumpHero } from "@/components/home-bitcoin";
import { Fingerprint, Landmark } from "lucide-react";
import reviewCarlos from "@/assets/review-carlos.jpg";
import reviewValeria from "@/assets/review-valeria.jpg";
import reviewDavid from "@/assets/review-david.jpg";
import reviewMarisol from "@/assets/review-marisol.jpg";
import { Target, DollarSign, Bot, Smartphone } from "lucide-react";
import { Lock, Gift, Search, Star, Quote, MessageSquare, Send, Activity } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
import { guideHref, guidesIndexHref } from "@/components/guide-layout";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { pickReviewsArm, REVIEWS_AB_KEY } from "@/lib/reviews-ab";
import { isReturning } from "@/lib/preferences";
import { AdvancedAccess, EntryAccess } from "@/components/entry-access";
import { PredictPromo } from "@/components/predict-promo";
import { DobleHero, Gta6Hero, HomeCtas } from "@/components/home-gta6";
import { BootSplash } from "@/components/boot-splash";
import { CalmHero } from "@/components/home-calm";
import { ThemeSections } from "@/components/home-sections";

/** Before hydration, returning visitors (flag set by a tiny head script) see the loading screen instead of the full page flashing. */
function ReturningCover() {
  return <div className="boveda-returning-cover"><BootSplash /></div>;
}

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  // Old campaign links (/?v=N) now live at their own address (/gta6, /bitcoin…).
  beforeLoad: ({ location }) => { const to = legacyHeroRedirect(location.searchStr); if (to) throw redirect({ href: to, statusCode: 301 }); },
  head: () => ({ meta: [
    { title: "Bóveda Market — Cuenta digital para generar intereses con monedas digitales" },
    { name: "description", content: "Crea una cuenta digital con Google, añade saldo y genera intereses con monedas digitales en bóvedas como GTA6 Coin y Trump Coin. Seguridad de Privy y depósitos gratis." },
    { property: "og:title", content: "Bóveda Market — Cuenta digital para generar intereses con monedas digitales" },
    { property: "og:description", content: "Crea una cuenta digital con Google, añade saldo y genera intereses con monedas digitales en bóvedas como GTA6 Coin y Trump Coin. Seguridad de Privy y depósitos gratis." },
    { property: "og:locale", content: "es_ES" }, { property: "og:locale:alternate", content: "en_US" }, { property: "og:type", content: "website" },
    ...shareMeta("es"), { property: "og:video", content: `https://bovedamarket.app${shareVideo.url}` }, { property: "og:video:secure_url", content: `https://bovedamarket.app${shareVideo.url}` }, { property: "og:video:type", content: "video/mp4" }, { property: "og:video:width", content: "1200" }, { property: "og:video:height", content: "630" },
    { property: "og:url", content: "https://bovedamarket.app/" },
  ], links: langLinks("es", "/", "/en"),
  scripts: [{ type: "application/ld+json", children: JSON.stringify({"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Bóveda Market","url":"https://bovedamarket.app/","logo":"https://bovedamarket.app/favicon.png","email":"admin@bovedamarket.app"},{"@type":"WebApplication","name":"Bóveda Market","url":"https://bovedamarket.app/","applicationCategory":"FinanceApplication","operatingSystem":"Web","inLanguage":"es","description":"Crea una cuenta digital con Google, añade saldo y genera intereses con monedas digitales en bóvedas como GTA6 Coin y Trump Coin. Seguridad de Privy y depósitos gratis.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}},{"@type":"HowTo","name":"Cómo abrir tu bóveda en 4 pasos","inLanguage":"es","step":[{"@type":"HowToStep","position":1,"name":"Crea una cuenta digital","text":"Crea una cuenta digital con tu email de Google, protegida por Privy."},{"@type":"HowToStep","position":2,"name":"Añade saldo","text":"Añade saldo a tu cuenta digital en dólares digitales."},{"@type":"HowToStep","position":3,"name":"Abre tu bóveda en un solo toque","text":"Confirmas una vez y el sistema compra las monedas a precio de mercado, arma la bóveda y empieza a generar intereses."},{"@type":"HowToStep","position":4,"name":"Sigue tus ganancias en vivo","text":"Desde Mi Portafolio ves tu balance, tus ganancias y lo que tienes por cosechar."}]}]}) }] }), component: Landing,
});

const FAQS = [
  { q: "¿Tengo que comprar Bitcoin, Trump u otras monedas para entrar?", a: "No. Solo necesitas dólares en tu cuenta. Abres tu bóveda en un solo toque: el sistema te guía, compra las monedas a precio de mercado y arma todo por ti. Confirmas una vez y tu bóveda empieza a generar intereses." },
  { q: "¿Qué es el dinero digital?", a: "Es dinero en dólares que vive en internet en lugar de en un banco. En Bóveda Market se usa USDC, un dólar digital emitido por la empresa Circle y respaldado por efectivo y bonos del Tesoro de EE. UU.: 1 USDC vale lo mismo que 1 dólar, así que el saldo no sube ni baja como otras monedas. Se envía en segundos a cualquier hora, se recarga con tarjeta o Apple Pay y se puede retirar al banco o a Coinbase. No es un depósito bancario ni está asegurado por el gobierno." },
  { q: "¿En cuál red opera Bóveda Market?", a: "Opera en Solana, una red pública de alta velocidad con comisiones de fracciones de centavo y confirmaciones en segundos. No es un banco ni un servidor privado: cada movimiento queda registrado en público y cualquiera puede revisarlo. Tu dinero nunca vive dentro de Bóveda Market: está en tu propia cuenta digital y solo tu firma lo mueve." },
  { q: "¿Puedo explorar sin depositar monedas digitales?", a: "Sí, totalmente. Puedes ver las bóvedas y Doble o Nada en vivo sin registrarte. Y si quieres conocer la billetera y el portafolio por dentro, basta con entrar con Google en 1 segundo: no se pide tarjeta ni depósito para explorar la app completa a tu propio ritmo." },
  { q: "¿Cómo se generan las ganancias?", a: "Cada depósito se suma a una bóveda que genera intereses cada vez que alguien intercambia monedas digitales en ella. Esos intereses se reparten entre quienes aportan. Las tasas son estimaciones, cambian y existe riesgo de pérdida." },
  { q: "¿Cuándo puedo retirar?", a: "Las ganancias se cosechan y las posiciones se cierran en cualquier momento, sin plazos de permanencia. Cada operación se revisa antes de firmar con la wallet." },
  { q: "¿Cuánto cuesta usar Bóveda Market?", a: "Depositar, enviar, cambiar monedas y entrar a Sube/Baja es gratis. Cosechar, cerrar, retirar y reclamar premios tienen un pequeño cargo de servicio, siempre visible antes de firmar. El detalle está en Términos y condiciones." },
];

const GUARANTEES = [
  { icon: ShieldCheck, title: "Control y firma propia", body: "Cada operación requiere autorización del titular. Bóveda Market nunca mueve fondos sin firma del titular." },
  { icon: Landmark, title: "Sin monedas digitales retenidas", body: "Sin plazos de permanencia. Salida libre de predicciones y bóvedas en cualquier momento." },
  { icon: Lock, title: "Seguridad moderna", body: "Acceso con huella, Face ID o email cifrado, sin frases secretas escritas en papel." },
];


const CALM_HOLD = [
  { icon: Target, title: "Bóvedas curadas por el equipo", body: "Cero estrés de adivinar. Solo seleccionamos activos con volumen real y alta demanda en el mercado, para que no tengas que investigar cientos de proyectos ni leer noticias financieras." },
  { icon: DollarSign, title: "Entras fácil solo con dólares", body: "Sin procesos técnicos ni compras confusas. Recargas con tarjeta, Apple Pay o transferencia y el sistema se encarga de todo el armado automáticamente." },
  { icon: Bot, title: "Piloto Automático: un bot con una sola misión", body: "Vigilar y optimizar 24/7 para que tú no tengas que mirar pantallas. Su única tarea es mantener tu bóveda activa y generando comisiones, tanto en las subidas como en las bajadas del mercado." },
  { icon: ShieldCheck, title: "100% bajo tu autocustodia", body: "Paz mental total con tus fondos. El dinero nunca se entrega a Bóveda ni a terceros; vive en tu propia cuenta digital protegida por Privy y nadie puede moverlo, tocarlo o congelarlo sin tu firma." },
  { icon: Smartphone, title: "Mira tu bóveda cuando quieras", body: "Desde Mi Portafolio ves cuánto depositaste, cuánto tienes hoy y cuánto has ganado. Te avisamos por Telegram y en la campanita cuando el Piloto Automático mueve algo." },
];

const STEPS: [string, string][] = [
  ["Crea una cuenta digital con tu email de Google", "La cuenta digital y sus llaves de seguridad se crean al instante."],
  ["Añade saldo a tu cuenta digital", "Recarga dólares digitales con Apple Pay, Tarjeta de Crédito o Coinbase."],
  ["Abre tu bóveda en un solo toque", "Eliges la bóveda y confirmas una vez: el sistema compra las monedas a precio de mercado, arma tu bóveda y empieza a generar intereses las 24 horas. También puedes jugar las rondas relámpago de Doble o Nada. Retira al banco o a Coinbase cuando quieras."],
  ["Sigue tus ganancias en vivo", "Abre Mi Portafolio para ver tu balance, tus ganancias y lo que tienes por cosechar. Sin hojas de cálculo ni cuentas complicadas."],
];

const REVIEWS = [
  { stars: 5, name: "Carlos M.", photo: reviewCarlos, title: "Mi dinero digital está seguro y lo saco cuando quiero", tag: "Miembro Platino", text: "En otros sitios me engañaron y no me dejaban sacar mi plata. Aquí todo es diferente. Mi dinero digital está en mi propia cuenta digital. Cuando quiero pasarlo a mi banco, llega en minutos y nadie me pone trabas." },
  { stars: 4, name: "Valeria R.", photo: reviewValeria, title: "Veo todo clarito antes de mover un solo dólar", tag: "Miembro VIP", text: "La pantalla me muestra todo lo que va a pasar antes de tocar cualquier botón. Nadie puede tocar mi dinero digital si yo no doy permiso. Es muy fácil de usar y me da mucha tranquilidad." },
  { stars: 3, name: "David S.", photo: reviewDavid, title: "Empecé con poco dinero digital para probar", tag: "Miembro Oro", text: "No sabía cómo funcionaba esto, así que puse poquito dinero digital para aprender. En mi cuenta digital veo cómo el saldo crece día a día. Todo es transparente y no te inventan cosas raras." },
  { stars: 5, name: "Marisol T.", photo: reviewMarisol, title: "Gano intereses todos los días en mi cuenta digital", tag: "Miembro Diamante", text: "Puse unos ahorros en mi cuenta digital y todos los días veo cómo sube con intereses. Si tengo alguna duda, el equipo me contesta rápido por mensaje. Es como una alcancía moderna que sí da ganancias." },
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
  { icon: Fingerprint, title: "Seguridad a cargo de Privy", body: "La creación, el cifrado y la protección de cada cuenta digital corren sobre la infraestructura de Privy, con Face ID o huella. Bóveda Market nunca custodia las monedas digitales." },
  { icon: Landmark, title: "1 USDC = $1 siempre", body: "Nada de monedas locas que hoy suben y mañana se desploman. El saldo en dólares digitales se mantiene estable mientras genera rendimiento." },
  { icon: Search, title: "Revisión antes de aprobar", body: "Cada operación se simula primero: entradas, salidas y cargo exactos a la vista." },
];

/** Home page. `variant` pins one version (its own address, e.g. /bitcoin); without it "/" rotates them. */
export function Landing({ variant }: { variant?: number } = {}) {
  const { t, lang } = useI18n();
  const [compact, setCompact] = useState(false);
  const [decided, setDecided] = useState(false);
  useEffect(() => { setCompact(variant === undefined && isReturning() && !isHeroReview()); setDecided(true); void import("@/components/privy-access").catch(() => {}); }, []);
  const [showReviews, setShowReviews] = useState(true);
  useEffect(() => { setShowReviews(pickReviewsArm(new URLSearchParams(window.location.search).get("reviews"), (() => { try { return localStorage.getItem(REVIEWS_AB_KEY); } catch { return null; } })(), Math.random())); }, []);
  useEffect(() => { try { localStorage.setItem(REVIEWS_AB_KEY, showReviews ? "1" : "0"); } catch { /* ignore */ } }, [showReviews]);
  const [heroIdx, setHeroIdx] = useState(variant ?? 0);
  useEffect(() => {
    if (variant !== undefined) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(HERO_KEY); } catch { /* blocked storage */ }
    const i = pickHeroVariant(new URLSearchParams(window.location.search).get("v"), saved, Math.random());
    setHeroIdx(i);
    try { localStorage.setItem(HERO_KEY, String(i)); } catch { /* blocked storage */ }
  }, [variant]);
  const hero = HERO_VARIANTS[heroIdx] ?? HERO_VARIANTS[0]!;
  const gtaHero = hero.theme === "gta6";
  const dobleHero = hero.theme === "doble";
  const calmHero = hero.theme === "calm";
  const btcHero = hero.theme === "bitcoin";
  const trumpHero = hero.theme === "trump";
  const classicHero = !hero.theme;
  const plainHero = false;
  if (decided && compact) return <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-10 pt-20 text-foreground sm:py-10">
    <BrandLogo size="lg" />
    <h1 className="mt-4 text-center font-display text-3xl font-bold">{t("Bienvenido de nuevo")}</h1>
    <p className="mt-2 text-center text-sm text-muted-foreground">{t("Inicia sesión para ver la cuenta digital y las ganancias.")}</p>
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
        {btcHero && <div className="order-1 min-w-0 md:col-span-2"><BitcoinHero title={hero.title} sub={hero.sub} /></div>}
        {trumpHero && <div className="order-1 min-w-0 md:col-span-2"><TrumpHero title={hero.title} sub={hero.sub} /></div>}
        {classicHero && <div className="order-1 min-w-0 md:col-span-2"><ClassicHero title={hero.title} sub={hero.sub} /></div>}
        {calmHero && <div className="order-1 min-w-0 md:col-span-2"><CalmHero title={hero.title} sub={hero.sub} /></div>}
        {plainHero && <div className="order-1 min-w-0 text-center md:hidden"><h1 className="font-display text-3xl font-bold leading-tight">{t(hero.title)}</h1><p className="mt-2 font-display text-base font-semibold text-primary">{t(hero.sub)}</p>{showReviews && <TrustTicker />}</div>}
        <div className="order-3 min-w-0 text-center md:order-1 md:text-left">
          {plainHero && <h1 className="hidden font-display text-4xl font-bold leading-tight sm:text-5xl md:block">{t(hero.title)}</h1>}
          {plainHero && <><p className="mt-3 hidden font-display text-xl font-semibold text-primary md:block">{t(hero.sub)}</p><div className="hidden md:block">{showReviews && <TrustTicker />}</div></>}
        </div>
        <div id="acceso" className="order-2 min-w-0 scroll-mt-4 flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0">
          <HomeCtas vaultsFirst={gtaHero || calmHero || hero.theme === "trump"} trump={hero.theme === "trump"} />
          <EntryAccess />
          <p className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground"><Lock size={11} aria-hidden="true" /><span>Secured by</span><img src="/brands/privy-mark.png" alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">Privy</span><span aria-hidden="true">·</span><a href="https://www.privy.io/security" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline">{t("Conoce más")} ↗</a></p>
        </div>
      </section>

      {btcHero ? <BitcoinSections /> : <ThemeSections theme={hero.theme} />}

      <section aria-label={t("Cómo abrir tu bóveda en 4 pasos")} className="mb-4 py-8">
        <h2 className="font-display text-2xl font-bold">{t("Cómo abrir tu bóveda en 4 pasos")}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{STEPS.map(([h, d], i) => <li key={h} className="rounded-2xl border border-border bg-card p-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">{i + 1}</span><p className="mt-4 font-display font-semibold">{t(h)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(d)}</p></li>)}</ol>
      </section>

      <section aria-label={t("Abre tu bóveda y olvídate de las gráficas")} className="mb-4 py-8">
        <h2 className="font-display text-2xl font-bold">{t("Abre tu bóveda y olvídate de las gráficas")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("En el cripto tradicional comprar y holdear da ansiedad. En Bóveda Market, la volatilidad te paga intereses en cada subida y cada bajada.")}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">{CALM_HOLD.map(({ icon: Icon, title, body }) => <li key={title} className="rounded-2xl sm:last:odd:col-span-2 border border-border bg-card p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={18} aria-hidden="true" /></span><p className="mt-3 font-display font-semibold">{t(title)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ul>
        <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center font-display text-sm font-semibold leading-6">{t("El hold tradicional es esperar y rezar para que el precio suba. Holdear en Bóveda es cobrar comisiones mientras duermes, pase lo que pase con el precio.")}</p>
      </section>

      <section aria-label={t("Doble o Nada")} className="mb-4 grid items-center gap-6 py-8 md:grid-cols-2">
        <div className="text-center md:text-left"><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} loading="lazy" className="mx-auto h-16 w-auto md:mx-0 sm:h-20" /><p className="mt-1 text-xs font-bold uppercase tracking-widest text-primary">{t("Rondas relámpago")}</p><h2 className="mt-2 font-display text-3xl font-bold">{t("Mercados de predicción en tiempo real.")}</h2><p className="mt-3 text-muted-foreground">{t("Rondas de 5 min, 15 min y 4 h sobre Bitcoin, Ethereum y Solana. Se participa en dólares, sin comprar la moneda, y cada ronda se resuelve automáticamente.")}</p><Link to={guideHref("/guias/mercados-de-prediccion", lang)} className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4">{t("¿Cómo funciona? Lee la guía")} →</Link></div>
        <PredictPromo />
      </section>
      <section aria-label={t("Seguridad")} className="mb-12">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><ShieldCheck size={24} className="text-primary" aria-hidden="true" />{t("Tu seguridad, primero")}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-border bg-card p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={16} /></span><p className="mt-3 font-display text-sm font-semibold">{t(title)}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t(body)}</p></div>)}
        </div>
      </section>

      <section id="transparencia" className="mb-12 scroll-mt-6 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Send size={14} />{t("Canal oficial de Telegram")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{t("Transparencia total, en vivo")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("El canal @bovedamarket publica alertas automáticas del estado de la red y de la app, avisos de seguridad y cada mejora en cuanto sale.")}</p>
            <p className="mt-4 flex max-w-xl items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span>{t("El equipo de Bóveda Market nunca escribe primero por privado ni pide claves, frases de recuperación, códigos ni monedas digitales para habilitar un retiro. Cualquier mensaje así es una estafa.")}</span></p></div>
          <div className="flex shrink-0 flex-col gap-2"><Button asChild className="h-12"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer">{t("Unirme a @bovedamarket")}<ArrowRight size={16} /></a></Button><Link to="/status" search={{ from: "transparencia" }} className="flex items-center justify-center gap-1.5 text-sm text-primary underline"><Activity size={14} />{t("Ver estado del sistema")}</Link></div>
        </div>
      </section>

      <section className="border-t border-border py-12">
        <h2 className="font-display text-2xl font-bold">{t("Garantías de Bóveda Market")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">{GUARANTEES.map(({ icon: Icon, title, body }) => <li key={title} className="rounded-2xl border border-border bg-card p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={18} /></span>
          <p className="mt-4 font-display font-semibold">{t(title)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ul>
      </section>

      <section className="py-12">
        <div className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><Gift size={20} /></span>
          <h2 className="mt-4 font-display text-2xl font-bold">{t("Programa de socios")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Cualquier usuario puede ser socio. Cada socio recibe en USDC una parte de los cargos de las operaciones de sus invitados, sin costo extra para ellos.")}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">50%</p><p className="text-sm text-muted-foreground">{t("de los cargos de invitados directos")}</p></li>
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">10%</p><p className="text-sm text-muted-foreground">{t("de los cargos del segundo nivel")}</p></li>
          </ul>
          <Button asChild className="mt-5"><Link to="/invita">{t("Obtener mi enlace")}<ArrowRight size={16} /></Link></Button>
        </div>
      </section>

      <section id="opiniones" className="scroll-mt-4 py-12">
        {showReviews && <><h2 className="font-display text-2xl font-bold">{t("Lo que dice la comunidad")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{REVIEWS.map(({ stars, name, text, photo, title, tag }) => <li key={name} className={`relative flex flex-col rounded-2xl border bg-card p-5 ${stars === 5 ? "border-primary/40 bg-gradient-to-br from-primary/10 to-card" : "border-border"}`}>
          <Quote aria-hidden="true" size={28} className="absolute right-4 top-4 text-primary/15" />
          <div className="flex items-center gap-3"><img src={photo} alt="" loading="lazy" width={48} height={48} className="h-12 w-12 rounded-full border-2 border-primary/30 object-cover" />
            <div className="min-w-0"><p className="text-sm font-semibold">{name}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary"><Star size={9} className="fill-current" />{t(tag)}</span></div></div>
          <div className="mt-3 flex gap-0.5 text-primary" aria-label={`${stars}/5`}>{[1,2,3,4,5].map((n) => <Star key={n} size={15} className={n <= stars ? "fill-current" : "text-muted-foreground/40"} />)}</div>
          <p className="mt-2 font-display font-semibold leading-snug">{t(title)}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">“{t(text)}”</p></li>)}</ul></>}
      </section>

      <section className="py-12">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
        {FAQS.map(({ q, a }) => <details key={q} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium [&::-webkit-details-marker]:hidden"><span>{t(q)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <p className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(a)}</p>
        </details>)}
      </section>
    </main>
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to={lang === "en" ? "/en/about" : "/about"}>{t("Sobre Bóveda Market")}</Link><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to={guidesIndexHref(lang)}>{t("Guías")}</Link><Link to="/status">{t("Estado del sistema")}</Link><Link to="/terminos">{t("Términos")}</Link><Link to="/privacidad">{t("Privacidad")}</Link><AdvancedAccess /></nav><p className="mt-4 text-center"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("Soporte en Telegram")}</a>{" · "}<a href="mailto:admin@bovedamarket.app" className="text-primary underline">admin@bovedamarket.app</a></p><p className="mt-2 text-center">© {new Date().getFullYear()} Boveda Technologies</p></footer>
  </div>;
}
