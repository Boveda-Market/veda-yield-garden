import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { GUIDES } from "@/components/guide-layout";

const D = "Guías claras sobre dólares digitales (USDC): cómo comprarlos con tarjeta, retirarlos a Cash App o Bitcoin y protegerte de estafas.";
export const Route = createFileRoute("/guias/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Guías de dólares digitales (USDC) | BÓVEDA" }, { name: "description", content: D },
    { property: "og:title", content: "Guías de dólares digitales | BÓVEDA" }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { property: "og:url", content: "https://bovedamarket.app/guias" },
  ], links: [{ rel: "canonical", href: "https://bovedamarket.app/guias" }] }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback="/" />
    <h1 className="mt-10 font-display text-3xl font-bold">Guías</h1>
    <p className="mt-3 text-muted-foreground">Lo esencial para usar tus dólares digitales con seguridad.</p>
    <ul className="mt-8 space-y-3">{GUIDES.map((g) => <li key={g.to}><Link to={g.to} className="block rounded-2xl border border-border bg-card p-5 font-semibold hover:border-primary">{g.title} →</Link></li>)}</ul>
  </main>;
}
