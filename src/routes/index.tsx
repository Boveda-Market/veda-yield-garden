import { TokenIcon } from "@/components/token-icon";
import { allowTrialEntry } from "@/lib/trial-entry";
import { useT } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, KeyRound, Eye, UserPlus, Vault as VaultIcon, Coins, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryAccess } from "@/components/entry-access";
import { VAULTS } from "@/lib/vaults";
import { useQuery } from "@tanstack/react-query";
import { poolYieldOptions } from "@/lib/pool-yield";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "BÓVEDA — Pon tus monedas a trabajar" },
    { name: "description", content: "Entra a tu cuenta o prueba gratis con 1,000 créditos ficticios. Mira rendimientos estimados, cómo funciona y las comisiones antes de empezar." },
    { property: "og:title", content: "BÓVEDA — Pon tus monedas a trabajar" },
    { property: "og:description", content: "Prueba sin registro, revisa rendimientos estimados y entra en segundos con email o Google." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Landing,
});

const FAQS = [
  { q: "¿Qué es USDC?", a: "USDC es una moneda digital diseñada para mantener el mismo valor que el dólar estadounidense: 1 USDC busca valer 1 USD. En BÓVEDA tus saldos, depósitos y comisiones se muestran en USDC. No es un depósito bancario ni está asegurado." },
  { q: "¿Necesito dinero para usar BÓVEDA?", a: "No para empezar. Toca «Probar como invitado» y recibe 1,000 créditos ficticios para explorar sin registro ni wallet. Los créditos no se pueden retirar ni convertir en dinero." },
  { q: "¿Cómo se generan las ganancias?", a: "Tu depósito se suma a una bóveda que cobra comisiones cada vez que otras personas cambian monedas en ella. Esas comisiones se reparten entre quienes aportan. Las tasas son estimaciones, cambian y puedes perder dinero." },
  { q: "¿Cuándo puedo retirar?", a: "Puedes cosechar tus ganancias o cerrar tu posición cuando quieras, sin plazos de permanencia. Cada operación se revisa antes de firmar con tu wallet." },
  { q: "¿Qué comisiones cobra BÓVEDA?", a: "Enviar es gratis. Al depositar, los primeros 5 USDC son gratis y se cobra 0.5% sobre el resto. Al cosechar, retirar o cambiar, los primeros 10 USDC son gratis y se cobra 1.25% sobre el resto. Los costes de red se pagan aparte." },
];

function VaultTeaser({ id, name, pair, pool, risk }: (typeof VAULTS)[number]) {
  const t = useT();
  const q = useQuery({ ...poolYieldOptions(pool), enabled: id !== "rwa" });
  const apr = q.data?.apr;
  return <div className="rounded-2xl border border-border bg-card p-5 text-left">
    <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-display font-semibold"><TokenIcon symbol={pair.split("/")[0] ?? ""} size={24} />{t(name)}</p><span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{t("Riesgo")} {t(risk)}</span></div>
    <p className="text-xs text-muted-foreground">{pair}</p>
    <p className="mt-4 font-display text-3xl font-bold text-primary">{apr == null ? "—" : `${apr.toFixed(2)}%`}</p>
    <p className="text-xs text-muted-foreground">{apr == null ? (id === "rwa" ? t("Muy pronto") : q.isPending ? t("Consultando…") : t("Tasa no disponible")) : t("APR estimado · últimas 24 h")}</p>
    <Button asChild variant="ghost" size="sm" className="mt-3 px-0"><Link to="/prueba" onClick={allowTrialEntry}>{t("Ver en modo prueba")}<ArrowRight size={14} /></Link></Button>
  </div>;
}

function Landing() {
  const t = useT();
  const steps = [
    { icon: UserPlus, title: "Crea tu cuenta en segundos", body: "Entra con tu email o Google. Sin frases secretas complicadas." },
    { icon: VaultIcon, title: "Elige tu bóveda", body: "Tu depósito recibe parte de las comisiones que genera cada cambio de monedas." },
    { icon: Coins, title: "Cosecha o retira cuando quieras", body: "Mira tus ganancias subir en vivo y decide si cobrarlas, reinvertirlas o cerrar." },
  ];
  return <div className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Link to="/" className="flex items-center gap-3 font-display text-lg font-bold"><img src="/icon-512.png" alt="" className="h-9 w-9 rounded-lg" />BÓVEDA</Link><a href="#acceso" className="text-sm font-medium text-primary">{t("Entrar")}</a></header>
    <main className="mx-auto max-w-5xl px-6">
      <section className="grid items-center gap-10 pb-12 pt-6 md:grid-cols-2 md:pt-12">
        <div className="text-center md:text-left">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{t("Tus monedas generando comisiones, día a día.")}</h1>
          <p className="mt-5 text-lg leading-7 text-muted-foreground">{t("Con la simplicidad de una cuenta digital. Revisa tu saldo, tus ganancias y cada movimiento.")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs md:justify-start">
            {["Sin plazos de permanencia", "Tú tienes el control", "Prueba gratis con 1,000 créditos"].map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><ShieldCheck size={13} className="text-primary" />{t(b)}</li>)}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{t("Las ganancias cambian y puedes perder dinero.")}</p>
        </div>
        <div id="acceso" className="flex justify-center rounded-3xl border border-border bg-card p-6 shadow-sm [&>div]:mt-0">
          <EntryAccess />
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

      <section className="py-12">
        <h2 className="font-display text-2xl font-bold">{t("Bóvedas disponibles")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("Rendimientos estimados con datos actuales. No están garantizados.")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">{VAULTS.map((v) => <VaultTeaser key={v.id} {...v} />)}</div>
      </section>

      <section className="border-t border-border py-12">
        <h2 className="font-display text-2xl font-bold">{t("Cómo funciona")}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">{steps.map(({ icon: Icon, title, body }, i) => <li key={title} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon size={18} /></span><span className="text-xs text-muted-foreground">{t("Paso")} {i + 1}</span></div>
          <p className="mt-4 font-display font-semibold">{t(title)}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{t(body)}</p></li>)}</ol>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-3">
        <p className="flex items-center gap-2"><Eye size={16} className="text-primary" />{t("Enviar: 0% de comisión")}</p>
        <p className="flex items-center gap-2"><Eye size={16} className="text-primary" />{t("Depósitos: primeros 5 USDC gratis")}</p>
        <p className="flex items-center gap-2"><KeyRound size={16} className="text-primary" />{t("Sin costos ocultos")}</p>
      </section>

      <section className="py-12">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-bold">{t("Preguntas frecuentes")}</h2><Link to="/faq" className="text-sm text-primary underline">{t("Ver todas")}</Link></div>
        {FAQS.map(({ q, a }) => <details key={q} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-sm font-medium [&::-webkit-details-marker]:hidden"><span>{t(q)}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <p className="max-w-2xl pb-4 text-sm leading-7 text-muted-foreground">{t(a)}</p>
        </details>)}
      </section>
    </main>
    <footer className="mx-auto max-w-5xl border-t border-border px-6 py-6 text-xs leading-5 text-muted-foreground"><nav className="flex flex-wrap justify-center gap-5"><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to="/terminos">{t("Términos")}</Link><Link to="/privacidad">{t("Privacidad")}</Link></nav><p className="mt-4 text-center">{t("Boveda Technologies LLC · No es un banco. Sin ganancias garantizadas. Prueba no mueve fondos.")}</p></footer>
  </div>;
}
