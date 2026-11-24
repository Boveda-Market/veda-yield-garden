import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { useI18n, type Lang } from "@/lib/i18n";
import { SITE_URL, langLinks } from "@/lib/seo-lang";

/** English body of a guide; the Spanish body stays the route's children. */
export type GuideEn = { title: string; intro: string; body: ReactNode };

export const GUIDES = [
  { to: "/guias/ganar-intereses-bitcoin", toEn: "/en/guides/earn-interest-on-bitcoin", titleEn: "How to earn interest on Bitcoin without being an expert", title: "Cómo ganar intereses con Bitcoin sin ser experto", descEn: "What the Bitcoin Vault is, where its interest comes from, how much you can earn and how to start with just digital dollars. Explained simply." },
  { to: "/guias/mercados-de-prediccion", toEn: "/en/guides/prediction-markets", titleEn: "Prediction markets: what they are and how to play Up or Down", title: "Mercados de predicción: qué son y cómo jugar Sube o Baja", descEn: "What a prediction market is, how the prize is calculated and how to play Up or Down on Bitcoin, Ethereum and Solana in 5-minute rounds, in dollars." },
  { to: "/guias/bovedas-alto-rendimiento", toEn: "/en/guides/high-yield-vaults", titleEn: "Complete guide to high-yield vaults (like the GTA6 Vault)", title: "Guía completa de bóvedas de altos intereses (como la Bóveda GTA6)", descEn: "What high-yield vaults are, where their APR comes from, why they rebalance, how to turn on alerts and what the risks are. Explained simply." },
  { to: "/guias/recargar-con-coinbase", toEn: "/en/guides/add-dollars-with-coinbase", titleEn: "How to add dollars with Coinbase in Bóveda Market", title: "Cómo recargar dólares con Coinbase en Bóveda Market", descEn: "Sign in with Google and add dollars with your card, bank or Coinbase balance in minutes. Step by step, costs and security." },
  { to: "/guias/que-es-usdc", toEn: "/en/guides/what-is-usdc", titleEn: "What is USDC and how do you buy it with a card?", title: "¿Qué es USDC y cómo comprarlo con tarjeta?", descEn: "What USDC is, why it's always worth 1 dollar and how to buy it with a card in minutes without mixing it up with other cryptocurrencies." },
  { to: "/guias/retirar-cash-app-bitcoin", toEn: "/en/guides/withdraw-to-cash-app-bitcoin", titleEn: "How to withdraw your digital dollars to Cash App or Bitcoin", title: "Cómo retirar tus dólares digitales a Cash App o Bitcoin", descEn: "Step by step to convert your USDC and receive it in Cash App as Bitcoin, or withdraw it to your bank, approving everything with your fingerprint." },
  { to: "/guias/invertir-sin-estafas", toEn: "/en/guides/avoid-investment-scams", titleEn: "How to grow your money without falling for scams", title: "Cómo hacer rendir tu dinero sin caer en estafas", descEn: "Lessons from Celsius, FTX and apps that froze withdrawals: red flags and how to protect your dollars with self-custody." },
] as const;

type Guide = (typeof GUIDES)[number];
export type GuidePath = Guide["to"];
const byPath = (p: GuidePath) => GUIDES.find((g) => g.to === p) as Guide;

/** Link target for a guide in the visitor's language (English twins live under /en/guides). */
export function guideHref(p: GuidePath, lang: Lang): GuidePath | Guide["toEn"] {
  return lang === "en" ? byPath(p).toEn : p;
}
export const guidesIndexHref = (lang: Lang) => (lang === "en" ? "/en/guides" : "/guias") as "/en/guides" | "/guias";

function articleHead(lang: Lang, o: { esPath: string; enPath: string; title: string; description: string }) {
  const en = lang === "en";
  const url = `${SITE_URL}${en ? o.enPath : o.esPath}`;
  return {
    meta: [
      { title: `${o.title} | Bóveda Market` },
      { name: "description", content: o.description },
      { property: "og:title", content: o.title },
      { property: "og:description", content: o.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:locale", content: en ? "en_US" : "es_ES" },
      { property: "og:locale:alternate", content: en ? "es_ES" : "en_US" },
      { name: "twitter:card", content: "summary" },
    ],
    links: langLinks(lang, o.esPath, o.enPath),
    scripts: [{ type: "application/ld+json", children: JSON.stringify([
      { "@context": "https://schema.org", "@type": "Article", headline: o.title, description: o.description, inLanguage: lang, mainEntityOfPage: url, author: { "@type": "Organization", name: "Bóveda Market" }, publisher: { "@type": "Organization", name: "Boveda Technologies", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: `${SITE_URL}${en ? "/en" : "/"}` },
        { "@type": "ListItem", position: 2, name: en ? "Guides" : "Guías", item: `${SITE_URL}${en ? "/en/guides" : "/guias"}` },
        { "@type": "ListItem", position: 3, name: o.title, item: url },
      ] },
    ]) }],
  };
}

/** Head for the Spanish guide; lists its English twin as hreflang alternate. */
export function guideHead(o: { path: GuidePath; title: string; description: string }) {
  return articleHead("es", { esPath: o.path, enPath: byPath(o.path).toEn, title: o.title, description: o.description });
}

/** Head for the English twin under /en/guides, built from the shared GUIDES entry. */
export function guideHeadEn(path: GuidePath) {
  const g = byPath(path);
  return articleHead("en", { esPath: g.to, enPath: g.toEn, title: g.titleEn, description: g.descEn });
}

export function GuideLayout({ title, intro, minutes, current, children, en }: { title: string; intro: string; minutes: number; current: GuidePath; children: ReactNode; en?: GuideEn }) {
  const { lang, t } = useI18n();
  const isEn = lang === "en" && !!en;
  if (isEn) { title = en.title; intro = en.intro; }
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback="/" />
    <nav aria-label={t("Migas de pan")} className="mt-8 text-xs text-muted-foreground"><Link to={lang === "en" ? "/en" : "/"} className="hover:text-primary">{t("Página de inicio")}</Link> / <Link to={guidesIndexHref(lang)} className="hover:text-primary">{t("Guías")}</Link></nav>
    <h1 className="mt-3 font-display text-3xl font-bold leading-tight">{title}</h1>
    <p className="mt-2 text-xs text-muted-foreground">{t("Lectura de {n} min · Guía de Bóveda Market", { n: minutes })}</p>
    <p className="mt-5 text-base leading-7 text-foreground/90">{intro}</p>
    <article className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:text-foreground">{isEn ? en.body : children}</article>
    <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
      <h2 className="font-display text-lg font-semibold">{t("Empieza a tu ritmo")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("Abre tu billetera en dólares en un minuto con Google y empieza con poco. Retiras cuando quieras.")}</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link to={lang === "en" ? "/en" : "/"} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("Abrir mi billetera")}</Link></div>
    </section>
    <nav className="mt-10 border-t border-border pt-5"><h2 className="mb-3 text-sm font-semibold">{t("Más guías")}</h2><ul className="space-y-2 text-sm text-primary">{GUIDES.filter((g) => g.to !== current).map((g) => <li key={g.to}><Link to={lang === "en" ? g.toEn : g.to}>{lang === "en" ? g.titleEn : g.title}</Link></li>)}</ul>
      <p className="mt-6 text-xs text-muted-foreground">{t("Contenido educativo, no es asesoría financiera. Las bóvedas pueden perder capital y no hay ganancias garantizadas. ¿Dudas?")} <a href="mailto:admin@bovedamarket.app" className="text-primary underline">admin@bovedamarket.app</a></p></nav>
  </main>;
}
