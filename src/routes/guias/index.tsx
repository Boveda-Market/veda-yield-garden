import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { GUIDES } from "@/components/guide-layout";
import { useI18n } from "@/lib/i18n";
import { langLinks } from "@/lib/seo-lang";

const D = "Guías claras sobre dólares digitales (USDC): cómo comprarlos con tarjeta, retirarlos a Cash App o Bitcoin y protegerte de estafas.";
export const Route = createFileRoute("/guias/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Guías de dólares digitales (USDC) | Bóveda Market" }, { name: "description", content: D },
    { property: "og:title", content: "Guías de dólares digitales | Bóveda Market" }, { property: "og:description", content: D },
    { property: "og:locale", content: "es_ES" }, { property: "og:locale:alternate", content: "en_US" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { property: "og:url", content: "https://bovedamarket.app/guias" },
  ], links: langLinks("es", "/guias", "/en/guides") }),
  component: GuidesIndex,
});

export function GuidesIndex() {
  const { lang, t } = useI18n();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback="/" />
    <h1 className="mt-10 font-display text-3xl font-bold">{t("Guías")}</h1>
    <p className="mt-3 text-muted-foreground">{t("Lo esencial para usar tus dólares digitales con seguridad.")}</p>
    <ul className="mt-8 space-y-3">{GUIDES.map((g) => <li key={g.to}><Link to={lang === "en" ? g.toEn : g.to} className="block rounded-2xl border border-border bg-card p-5 font-semibold hover:border-primary">{lang === "en" ? g.titleEn : g.title} →</Link></li>)}</ul>
  </main>;
}
