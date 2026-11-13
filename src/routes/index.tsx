import { Fingerprint, TrendingUp, Landmark } from "lucide-react";
import { Lock, Gift, Search, Star, MessageSquare, Send, Activity } from "lucide-react";
import { allowTrialEntry } from "@/lib/trial-entry";
import { useT } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { isReturning } from "@/lib/preferences";
import { EntryAccess } from "@/components/entry-access";
import { HomePredict } from "@/components/home-predict";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "BÓVEDA — Pon tus monedas a trabajar" },
    { name: "description", content: "Entra a tu cuenta o prueba gratis con 1,000 créditos ficticios. Mira rendimientos estimados, cómo funciona y las comisiones antes de empezar." },
    { property: "og:title", content: "BÓVEDA — Pon tus monedas a trabajar" },
    { property: "og:description", content: "Bóvedas que generan comisiones en USDC y predicciones Sube/Baja de BTC, ETH y SOL. Pruébalo gratis sin registro con 1,000 créditos ficticios." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:url", content: "https://bovedamarket.app/" },
  ], links: [{ rel: "canonical", href: "https://bovedamarket.app/" }] }), component: Landing,
});

const FAQS = [
  { q: "¿Qué es USDC?", a: "USDC es una moneda digital diseñada para mantener el mismo valor que el dólar estadounidense: 1 USDC busca valer 1 USD. En BÓVEDA tus saldos, depósitos y comisiones se muestran en USDC. No es un depósito bancario ni está asegurado." },
  { q: "¿Necesito dinero para usar BÓVEDA?", a: "No para empezar. Toca «Probar como invitado» y recibe 1,000 créditos ficticios para explorar sin registro ni wallet. Los créditos no se pueden retirar ni convertir en dinero." },
  { q: "¿Cómo se generan las ganancias?", a: "Tu depósito se suma a una bóveda que cobra comisiones cada vez que otras personas cambian monedas en ella. Esas comisiones se reparten entre quienes aportan. Las tasas son estimaciones, cambian y puedes perder dinero." },
  { q: "¿Cuándo puedo retirar?", a: "Puedes cosechar tus ganancias o cerrar tu posición cuando quieras, sin plazos de permanencia. Cada operación se revisa antes de firmar con tu wallet." },
  { q: "¿Qué comisiones cobra BÓVEDA?", a: "Enviar y cambiar monedas es gratis, y entrar a Sube/Baja también. Depositar en una bóveda es gratis. Al cosechar, cerrar o retirar pagas una comisión progresiva: mientras más mueves, menor el porcentaje (de 3% a 0.40%). En Sube/Baja pagas 2% de lo que cobres al reclamar. Los costes de red se pagan aparte." },
];

const LEARN: [string, string][] = [
  ["¿Qué es USDC?", "Una moneda digital que busca valer 1 dólar. Tu saldo, tus predicciones y tus retiros se manejan en USDC para que no dependan de monedas que suben y bajan."],
  ["¿Cómo funciona Sube/Baja?", "No compras cripto: predices si el precio de BTC, ETH o SOL termina arriba o abajo al cerrar la ronda. Cada contrato ganador paga 1.00 USDC y nunca pierdes más de lo que pusiste."],
  ["¿Cómo se generan las comisiones en las bóvedas?", "Tu aporte se suma a una bóveda que cobra comisiones cuando otras personas cambian monedas. Las tasas son estimadas, cambian y puedes perder dinero."],
  ["¿Cuánto cuesta retirar?", "BÓVEDA cobra de 2% a 0.50% en retiros a banco o Cash App según el monto, y lo ves antes de firmar. Para Cash App hay un mínimo de 25 USDC para que el costo de la red no se coma tu dinero."],
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
  { stars: 5, name: "Carlos M.", text: "Perdí dinero en plataformas que prometían 20% mensual y luego bloquearon los retiros. Aquí mi dinero está en mi wallet y retiré a Coinbase en minutos sin pedir permiso." },
  { stars: 4, name: "Valeria R.", text: "La revisión antes de firmar me da paz. Le doy 4 porque a veces la red tarda unos segundos más, pero saber que nadie toca mis USDC vale la pena." },
  { stars: 3, name: "David S.", text: "Perdí mi primera ronda de Sube o Baja por no entender los tiempos. Me gusta que no venden humo: recomiendo practicar primero con la prueba gratis." },
];

const TRUST = [
  { icon: Fingerprint, title: "Tus fondos, tu control", body: "Wallet de autocustodia con Face ID o huella, protegida por Privy. Nadie mueve tu dinero sin tu aprobación digital." },
  { icon: Landmark, title: "1 USDC = $1 siempre", body: "Nada de monedas locas que hoy suben y mañana se desploman. Tu saldo se mantiene estable mientras genera comisiones reales." },
  { icon: Search, title: "Revisas antes de aprobar", body: "Cada operación se simula primero: ves exactamente qué entra, qué sale y el cargo." },
  { icon: ShieldCheck, title: "Sin cargos ocultos", body: "Recargas y retiros con Coinbase. Cargos de servicio reducidos y progresivos." },
];

const PRICING: [string, string][] = [
  ["Depositar en una bóveda", "Gratis"],
  ["Cambiar y enviar monedas", "Gratis"],
  ["Entrar a Sube o Baja", "Gratis"],
  ["Cosechar ganancias", "3% a 1% de lo cosechado"],
  ["Cobrar una ronda ganada", "2% de lo cobrado"],
];

function Landing() {
  const t = useT();
  const steps = [
    { icon: Fingerprint, title: "Entra en segundos con un toque", body: "Inicia sesión con Google, email o tu huella o Face ID. Tu cuenta queda lista al instante." },
    { icon: TrendingUp, title: "Genera saldo a tu ritmo", body: "Predice si el precio sube o baja en rondas de 5 min, 15 min o diarias, o recibe comisiones con las bóvedas." },
    { icon: Landmark, title: "Retira cuando quieras", body: "Envía tus USDC a Coinbase o PayPal para tu banco, o recibe Bitcoin automático en tu Cash App." },
  ];
  const [compact, setCompact] = useState(false);
  useEffect(() => { setCompact(isReturning()); }, []);
  if (compact) return <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
    <img src="/icon-512.png" alt="" className="h-14 w-14 rounded-2xl" />
    <h1 className="mt-4 text-center font-display text-3xl font-bold">{t("Bienvenido de nuevo")}</h1>
    <p className="mt-2 text-center text-sm text-muted-foreground">{t("Entra para ver tu wallet y tus ganancias.")}</p>
    <div className="mt-2 flex w-full max-w-sm flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0"><EntryAccess /></div>
    <button type="button" onClick={() => setCompact(false)} className="mt-6 text-sm text-primary underline underline-offset-4">{t("Ver portada completa")}</button>
    <Link to="/prueba" onClick={allowTrialEntry} className="mt-3 text-xs text-muted-foreground underline underline-offset-4">{t("Prueba gratis")}</Link>
  </div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Link to="/" className="flex items-center gap-3 font-display text-lg font-bold"><img src="/icon-512.png" alt="" className="h-9 w-9 rounded-lg" />BÓVEDA</Link><div className="flex items-center gap-2"><a href="#acceso" className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground">{t("Iniciar sesión")}</a><Link to="/prueba" onClick={allowTrialEntry} className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary"><Sparkles size={13} />{t("Prueba gratis")}</Link></div></header>
    <main className="mx-auto max-w-5xl px-6">
      <section className="grid items-center gap-6 pb-12 pt-2 md:grid-cols-2 md:gap-10 md:pt-12">
        <div className="order-1 text-center md:hidden"><h1 className="font-display text-3xl font-bold leading-tight">{t(" Nada de monedas locas. Genera ganancias reales.")}</h1><p className="mt-2 font-display text-base font-semibold text-primary">{t("Tus fondos siempre bajo tu control. $0 por empezar y retiras todo en el momento que quieras garantizado.")}</p></div>
        <div className="order-3 text-center md:order-1 md:text-left">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck size={13} />{t("100% autocustodia · Nadie custodia tus fondos")}</p>
          <h1 className="hidden font-display text-4xl font-bold leading-tight sm:text-5xl md:block">{t(" Nada de monedas locas. Genera ganancias reales.")}</h1>
          <p className="mt-3 hidden font-display text-xl font-semibold text-primary md:block">{t("Tus fondos siempre bajo tu control. $0 por empezar y retiras todo en el momento que quieras garantizado.")}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground md:justify-start">{[["Powered by","Coinbase","/brands/coinbase.svg"],["Secured by","Privy","/brands/privy-mark.png"],["Network","Solana","/brands/solana.svg"]].map(([l,n,src]) => <span key={n} className="flex items-center gap-1.5"><span>{l}</span><img src={src} alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-medium text-foreground">{n}</span>{n === "Solana" && <span className="ml-1 flex items-center gap-1 font-semibold text-primary"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" /></span>{t("Online")}</span>}</span>)}</div>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{t("BÓVEDA no es un banco ni un fondo que pueda congelar tu dinero. Es una interfaz segura, protegida contra hackers, donde solo tú apruebas cada movimiento con tu huella o Face ID.")}</p>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{t("Depositar, cambiar y enviar es gratis. Solo cobramos un pequeño cargo cuando tú cosechas ganancias o cobras una ronda ganada: solo ganamos cuando tú ganas.")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs md:justify-start">
            {["$0 por depositar", "Sin plazos forzosos", "Retiras cuando quieras", "Prueba gratis con 1,000 créditos"].map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><ShieldCheck size={13} className="text-primary" />{t(b)}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{t("Las ganancias cambian y puedes perder dinero.")}</p>
        </div>
        <div id="acceso" className="order-2 scroll-mt-4 flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0">
          <EntryAccess />
          <p className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground"><Lock size={11} aria-hidden="true" /><span>Secured by</span><img src="/brands/privy-mark.png" alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">Privy</span></p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">{["Tú tienes el control total", "Sin plazos de permanencia"].map((b) => <li key={b} className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-medium text-foreground"><ShieldCheck size={12} className="text-primary" />{t(b)}</li>)}</ul>
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

      <section className="mb-12 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Send size={14} />{t("Canal oficial de Telegram")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{t("Transparencia total, en vivo")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("Únete a @bovedamarket: recibe alertas automáticas del estado de la red y de la app, avisos de seguridad y cada mejora en cuanto sale.")}</p></div>
          <div className="flex shrink-0 flex-col gap-2"><Button asChild className="h-12"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer">{t("Unirme a @bovedamarket")}<ArrowRight size={16} /></a></Button><Link to="/status" className="flex items-center justify-center gap-1.5 text-sm text-primary underline"><Activity size={14} />{t("Ver estado del sistema")}</Link></div>
        </div>
      </section>

      <section className="mb-12 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Cuentas claras")}</p>
        <h2 className="mt-2 font-display text-2xl font-bold">{t("Solo ganamos cuando tú ganas")}</h2>
        <ul className="mt-5 divide-y divide-border">{PRICING.map(([a, b]) => <li key={a} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{t(a)}</span><span className="text-right font-semibold text-primary">{t(b)}</span></li>)}</ul>
        <p className="mt-4 text-xs text-muted-foreground">{t("Mientras más mueves, menor el porcentaje. Siempre ves el cargo exacto antes de firmar. Los costos de red se pagan aparte.")} <Link to="/terminos" className="text-primary underline">{t("Ver detalle")}</Link></p>
      </section>

      <section className="rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles size={14} />{t("Simulador sin riesgo")}</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{t("Prueba primero, sin arriesgar dinero.")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("Recibe 1,000 créditos ficticios para depositar, cosechar ganancias y hacer cambios. Sin registro, sin wallet y sin mover dinero.")}</p></div>
          <Button asChild className="h-12 shrink-0"><Link to="/prueba" onClick={allowTrialEntry}>{t("Probar como invitado")}<ArrowRight size={16} /></Link></Button>
        </div>
      </section>

      <HomePredict />

      <section className="border-t border-border py-12">
        <h2 className="font-display text-2xl font-bold">{t("Cómo funciona")}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">{steps.map(({ icon: Icon, title, body }, i) => <li key={title} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={18} /></span><span className="text-xs text-muted-foreground">{t("Paso")} {i + 1}</span></div>
          <p className="mt-4 font-display font-semibold">{t(title)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ol>
        <details className="group mt-5 rounded-2xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-display text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden"><span>{t("Conoce los detalles a fondo")}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
          <dl className="grid gap-4 px-4 pb-5 sm:grid-cols-2">{LEARN.map(([h, d]) => <div key={h}><dt className="font-display text-sm font-semibold">{t(h)}</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{t(d)}</dd></div>)}</dl>
        </details>
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
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Cualquier usuario puede ser socio. Comparte tu enlace y recibe en USDC una parte de la comisión de cada operación de tus invitados, sin costo extra para ellos.")}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">50%</p><p className="text-sm text-muted-foreground">{t("de las comisiones de tus invitados directos")}</p></li>
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">10%</p><p className="text-sm text-muted-foreground">{t("de los invitados de tus invitados")}</p></li>
            <li className="rounded-2xl border border-border bg-card p-4"><p className="font-display text-2xl font-bold text-primary">10 USDC</p><p className="text-sm text-muted-foreground">{t("para cobrar tú mismo, directo a tu wallet")}</p></li>
          </ul>
          <Button asChild className="mt-5"><Link to="/invita">{t("Obtener mi enlace")}<ArrowRight size={16} /></Link></Button>
        </div>
      </section>

      <section className="py-12">
        <h2 className="font-display text-2xl font-bold">{t("Lo que dice la comunidad")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("Opiniones ilustrativas de la experiencia; publicaremos reseñas reales a medida que lleguen.")}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">{REVIEWS.map(({ stars, name, text }) => <li key={name} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-0.5 text-primary" aria-label={`${stars}/5`}>{[1,2,3,4,5].map((n) => <Star key={n} size={15} className={n <= stars ? "fill-current" : "text-muted-foreground/40"} />)}</div>
          <p className="mt-3 text-sm leading-6">“{t(text)}”</p><p className="mt-3 text-xs font-semibold text-muted-foreground">{name}</p></li>)}</ul>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="flex items-center gap-2 font-display font-semibold"><MessageSquare size={16} className="text-primary" />{t("¿Qué te gusta y qué no? Cuéntanos")}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{t("Envía sugerencias, críticas o tu reseña desde ☰ Menú → «Ayúdanos a mejorar». Leemos cada mensaje para mejorar BÓVEDA.")}</p></div>
          <Button asChild variant="outline" className="shrink-0"><a href="#acceso">{t("Entrar y opinar")}</a></Button>
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
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to="/status">{t("Estado del sistema")}</Link><Link to="/terminos">{t("Términos")}</Link><Link to="/privacidad">{t("Privacidad")}</Link></nav><p className="mt-4 text-center"><a href="https://t.me/bovedamarket" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("Soporte en Telegram")}</a></p><p className="mt-4 text-center text-[11px] text-muted-foreground/80">{t("Coinbase y Privy son marcas registradas de sus respectivos titulares y operan como proveedores independientes de BÓVEDA (compra y retiro de fondos, y acceso con autocustodia). El uso de sus nombres y logotipos no implica patrocinio ni respaldo directo.")}</p><p className="mt-2 text-center">{t("Boveda Technologies LLC · Interfaz no custodia. No es un banco ni asesoría financiera. Sin ganancias garantizadas: bóvedas y Sube/Baja pueden perder capital. Prueba usa créditos ficticios y no mueve fondos.")}</p></footer>
  </div>;
}
