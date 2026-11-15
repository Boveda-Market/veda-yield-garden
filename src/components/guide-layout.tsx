import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";

export const GUIDES = [
  { to: "/guias/recargar-con-coinbase", title: "Cómo recargar dólares con Coinbase en BÓVEDA" },
  { to: "/guias/que-es-usdc", title: "¿Qué es USDC y cómo comprarlo con tarjeta?" },
  { to: "/guias/retirar-cash-app-bitcoin", title: "Cómo retirar tus dólares digitales a Cash App o Bitcoin" },
  { to: "/guias/invertir-sin-estafas", title: "Cómo hacer rendir tu dinero sin caer en estafas" },
] as const;

export function guideHead(o: { path: string; title: string; description: string }) {
  const url = `https://bovedamarket.app${o.path}`;
  return {
    meta: [
      { title: `${o.title} | BÓVEDA` },
      { name: "description", content: o.description },
      { property: "og:title", content: o.title },
      { property: "og:description", content: o.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify([
      { "@context": "https://schema.org", "@type": "Article", headline: o.title, description: o.description, inLanguage: "es", mainEntityOfPage: url, author: { "@type": "Organization", name: "BÓVEDA" }, publisher: { "@type": "Organization", name: "Boveda Technologies LLC", logo: { "@type": "ImageObject", url: "https://bovedamarket.app/icon-512.png" } } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://bovedamarket.app/" },
        { "@type": "ListItem", position: 2, name: "Guías", item: "https://bovedamarket.app/guias" },
        { "@type": "ListItem", position: 3, name: o.title, item: url },
      ] },
    ]) }],
  };
}

export function GuideLayout({ title, intro, minutes, current, children }: { title: string; intro: string; minutes: number; current: string; children: ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback="/" />
    <nav aria-label="Migas de pan" className="mt-8 text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">Inicio</Link> / <Link to="/guias" className="hover:text-primary">Guías</Link></nav>
    <h1 className="mt-3 font-display text-3xl font-bold leading-tight">{title}</h1>
    <p className="mt-2 text-xs text-muted-foreground">Lectura de {minutes} min · Guía de BÓVEDA</p>
    <p className="mt-5 text-base leading-7 text-foreground/90">{intro}</p>
    <article className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_strong]:text-foreground">{children}</article>
    <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
      <h2 className="font-display text-lg font-semibold">Empieza a tu ritmo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Abre tu billetera en dólares en un minuto con Google y empieza con poco. Retiras cuando quieras.</p>
      <div className="mt-4 flex flex-wrap gap-3"><Link to="/" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Abrir mi billetera</Link></div>
    </section>
    <nav className="mt-10 border-t border-border pt-5"><h2 className="mb-3 text-sm font-semibold">Más guías</h2><ul className="space-y-2 text-sm text-primary">{GUIDES.filter((g) => g.to !== current).map((g) => <li key={g.to}><Link to={g.to}>{g.title}</Link></li>)}</ul>
      <p className="mt-6 text-xs text-muted-foreground">Contenido educativo, no es asesoría financiera. Las bóvedas pueden perder capital y no hay ganancias garantizadas. ¿Dudas? <a href="mailto:admin@bovedamarket.app" className="text-primary underline">admin@bovedamarket.app</a></p></nav>
  </main>;
}
