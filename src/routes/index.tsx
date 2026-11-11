import { Fingerprint, TrendingUp, Landmark } from "lucide-react";
import { Lock } from "lucide-react";
import { PoweredBy } from "@/components/powered-by";
import { allowTrialEntry } from "@/lib/trial-entry";
import { useT } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryAccess } from "@/components/entry-access";
import { HomePredict } from "@/components/home-predict";

export const Route = createFileRoute("/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "BÓVEDA — Pon tus monedas a trabajar" },
    { name: "description", content: "Entra a tu cuenta o prueba gratis con 1,000 créditos ficticios. Mira rendimientos estimados, cómo funciona y las comisiones antes de empezar." },
    { property: "og:title", content: "BÓVEDA — Pon tus monedas a trabajar" },
    { property: "og:description", content: "Prueba sin registro, revisa rendimientos estimados y entra en segundos con email o Google." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:url", content: "https://bovedamarket.app/" },
  ], links: [{ rel: "canonical", href: "https://bovedamarket.app/" }] }), component: Landing,
});

const FAQS = [
  { q: "¿Qué es USDC?", a: "USDC es una moneda digital diseñada para mantener el mismo valor que el dólar estadounidense: 1 USDC busca valer 1 USD. En BÓVEDA tus saldos, depósitos y comisiones se muestran en USDC. No es un depósito bancario ni está asegurado." },
  { q: "¿Necesito dinero para usar BÓVEDA?", a: "No para empezar. Toca «Probar como invitado» y recibe 1,000 créditos ficticios para explorar sin registro ni wallet. Los créditos no se pueden retirar ni convertir en dinero." },
  { q: "¿Cómo se generan las ganancias?", a: "Tu depósito se suma a una bóveda que cobra comisiones cada vez que otras personas cambian monedas en ella. Esas comisiones se reparten entre quienes aportan. Las tasas son estimaciones, cambian y puedes perder dinero." },
  { q: "¿Cuándo puedo retirar?", a: "Puedes cosechar tus ganancias o cerrar tu posición cuando quieras, sin plazos de permanencia. Cada operación se revisa antes de firmar con tu wallet." },
  { q: "¿Qué comisiones cobra BÓVEDA?", a: "Enviar y cambiar monedas es gratis, y entrar a Sube/Baja también. Al depositar, cosechar, cerrar o retirar se cobra 1%. En Sube/Baja solo pagas 1% de lo que ganes al reclamar. Los costes de red se pagan aparte." },
];

const LEARN: [string, string][] = [
  ["¿Qué es USDC?", "Una moneda digital que busca valer 1 dólar. Tu saldo, tus predicciones y tus retiros se manejan en USDC para que no dependan de monedas que suben y bajan."],
  ["¿Cómo funciona Sube/Baja?", "No compras cripto: predices si el precio de BTC, ETH o SOL termina arriba o abajo al cerrar la ronda. Cada contrato ganador paga 1.00 USDC y nunca pierdes más de lo que pusiste."],
  ["¿Cómo se generan las comisiones en las bóvedas?", "Tu aporte se suma a una bóveda que cobra comisiones cuando otras personas cambian monedas. Las tasas son estimadas, cambian y puedes perder dinero."],
  ["¿Cuánto cuesta retirar?", "BÓVEDA cobra una comisión fija del 1% en retiros a banco o Cash App, que ves antes de firmar. Para Cash App hay un mínimo de 25 USDC para que el costo de la red no se coma tu dinero."],
];

const GUARANTEES = [
  { icon: ShieldCheck, title: "Control y firma propia", body: "Cada operación requiere tu autorización. BÓVEDA nunca mueve tus fondos sin tu firma." },
  { icon: Landmark, title: "Sin dinero congelado", body: "Sin plazos de permanencia. Sales de tus predicciones o bóvedas cuando tú decidas." },
  { icon: Lock, title: "Seguridad moderna", body: "Entra con huella, Face ID o email cifrado, sin frases secretas escritas en papel." },
];

function Landing() {
  const t = useT();
  const steps = [
    { icon: Fingerprint, title: "Entra en segundos con un toque", body: "Inicia sesión con Google, email o tu huella o Face ID. Tu cuenta queda lista al instante." },
    { icon: TrendingUp, title: "Genera saldo a tu ritmo", body: "Predice si el precio sube o baja en rondas de 5 min, 15 min o diarias, o recibe comisiones con las bóvedas." },
    { icon: Landmark, title: "Retira cuando quieras", body: "Envía tus USDC a Coinbase o PayPal para tu banco, o recibe Bitcoin automático en tu Cash App." },
  ];
  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Link to="/" className="flex items-center gap-3 font-display text-lg font-bold"><img src="/icon-512.png" alt="" className="h-9 w-9 rounded-lg" />BÓVEDA</Link></header>
    <main className="mx-auto max-w-5xl px-6">
      <section className="grid items-center gap-10 pb-12 pt-6 md:grid-cols-2 md:pt-12">
        <div className="text-center md:text-left">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{t("Tus monedas generando comisiones, día a día.")}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-start [&>p]:justify-start"><PoweredBy brand="meteora" /><PoweredBy brand="polymarket" /></div>
          <p className="mt-5 text-lg leading-7 text-muted-foreground">{t("Con la simplicidad de una cuenta digital. Revisa tu saldo, tus ganancias y cada movimiento.")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs md:justify-start">
            {["Prueba gratis con 1,000 créditos"].map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><ShieldCheck size={13} className="text-primary" />{t(b)}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{t("Las ganancias cambian y puedes perder dinero.")}</p>
        </div>
        <div id="acceso" className="flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0">
          <EntryAccess />
          <p className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground"><Lock size={11} aria-hidden="true" /><span>Secured by</span><img src="/brands/privy-mark.png" alt="" className="h-4 w-4 rounded-full" loading="lazy" /><span className="font-semibold text-foreground">Privy</span></p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">{["Tú tienes el control total", "Sin plazos de permanencia"].map((b) => <li key={b} className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 font-medium text-foreground"><ShieldCheck size={12} className="text-primary" />{t(b)}</li>)}</ul>
        </div>
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
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
        {FAQS.map(({ q, a }) => <details key={q} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium [&::-webkit-details-marker]:hidden"><span>{t(q)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <p className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(a)}</p>
        </details>)}
      </section>
    </main>
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to="/terminos">{t("Términos")}</Link><Link to="/privacidad">{t("Privacidad")}</Link></nav><p className="mt-4 text-center"><a href="https://t.me/bovedaappsupport" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("Soporte y sugerencias en Telegram")}</a></p><p className="mt-4 text-center">{t("Boveda Technologies LLC · Interfaz no custodia. No es un banco ni asesoría financiera. Sin ganancias garantizadas: bóvedas y Sube/Baja pueden perder capital. Prueba usa créditos ficticios y no mueve fondos.")}</p></footer>
  </div>;
}
