import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { useI18n, type Lang } from "@/lib/i18n";
import { SITE_URL, langLinks } from "@/lib/seo-lang";

/** Two editorial voices: technical research and everyday/news. */
export const AUTHORS = {
  research: { name: "Investigación DeFi", nameEn: "DeFi Research", role: "Mercados y protocolos, en profundidad", roleEn: "Markets and protocols, in depth", initials: "ID" },
  editorial: { name: "Redacción Bóveda", nameEn: "Bóveda Editorial", role: "Ahorro, adopción y noticias del día a día", roleEn: "Savings, adoption and everyday news", initials: "RB" },
} as const;
export type AuthorId = keyof typeof AUTHORS;

/** Blog posts: friendly, conversational trend articles (guides stay evergreen how-tos). */
export const POSTS = [
  {
    to: "/blog/meteora-historia-y-como-funciona", toEn: "/en/blog/meteora-history-and-how-it-works", date: "2026-11-26", minutes: 8, author: "research",
    category: "Investigación y protocolos", categoryEn: "Research & protocols",
    title: "Meteora: la historia y el motor detrás de la liquidez",
    titleEn: "Meteora: the history and engine behind liquidity",
    desc: "Una casa de cambio explica la idea. De Mercurial a Meteora: cómo funcionan sus pools, qué aportan a los traders y cómo los proveedores de liquidez cobran por asumir riesgo.",
    descEn: "A currency exchange explains the idea. From Mercurial to Meteora: how its pools work, what traders gain and how liquidity providers earn for taking risk.",
  },
  {
    to: "/blog/liquidez-concentrada", toEn: "/en/blog/concentrated-liquidity", date: "2026-11-26", minutes: 7, author: "research",
    category: "Investigación y protocolos", categoryEn: "Research & protocols",
    title: "Por qué la liquidez es el motor de la blockchain (y cómo los proveedores capturan el valor de los creadores de mercado)",
    titleEn: "Why liquidity is the engine of the blockchain (and how providers capture market-maker value)",
    desc: "Del libro de órdenes al AMM y a la liquidez concentrada: eficiencia de capital, comisiones, pérdida no permanente y por qué aportar liquidez nueva puede ser justo y remunerado.",
    descEn: "From order books to AMMs and concentrated liquidity: capital efficiency, fees, impermanent loss and why adding new liquidity can be fair and paid.",
  },
  {
    to: "/blog/dolares-digitales-en-el-celular", toEn: "/en/blog/digital-dollars-on-your-phone", date: "2026-11-26", minutes: 4, author: "editorial",
    category: "Adopción y ahorro", categoryEn: "Adoption & savings",
    title: "Por qué cada vez más personas guardan dólares en el celular",
    titleEn: "Why more and more people keep dollars on their phone",
    desc: "Los dólares digitales ya superan a Bitcoin como la compra favorita en Latinoamérica. Te explicamos por qué, sin tecnicismos, y cómo ponerlos a trabajar.",
    descEn: "Digital dollars now outsell Bitcoin as Latin America's favorite purchase. We explain why, without jargon, and how to put them to work.",
  },
] as const;

type Post = (typeof POSTS)[number];
export type PostPath = Post["to"];
const byPath = (p: PostPath) => POSTS.find((x) => x.to === p) as Post;
export const blogIndexHref = (lang: Lang) => (lang === "en" ? "/en/blog" : "/blog") as "/en/blog" | "/blog";

export function blogIndexHead(lang: Lang) {
  const en = lang === "en";
  const title = en ? "Blog: crypto, digital dollars and adoption, explained simply | Bóveda Market" : "Blog: cripto, dólares digitales y adopción, explicados fácil | Bóveda Market";
  const d = en ? "Friendly, jargon-free articles about crypto trends, digital dollars and how people are using them to protect their savings." : "Artículos cercanos y sin tecnicismos sobre tendencias cripto, dólares digitales y cómo la gente los usa para cuidar sus ahorros.";
  return {
    meta: [
      { title }, { name: "description", content: d },
      { property: "og:title", content: title }, { property: "og:description", content: d },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `${SITE_URL}${en ? "/en/blog" : "/blog"}` },
      { property: "og:locale", content: en ? "en_US" : "es_ES" },
    ],
    links: langLinks(lang, "/blog", "/en/blog"),
  };
}

export function postHead(lang: Lang, path: PostPath) {
  const p = byPath(path); const en = lang === "en";
  const title = en ? p.titleEn : p.title; const d = en ? p.descEn : p.desc;
  const url = `${SITE_URL}${en ? p.toEn : p.to}`;
  return {
    meta: [
      { title: `${title} | Bóveda Market` }, { name: "description", content: d },
      { property: "og:title", content: title }, { property: "og:description", content: d },
      { property: "og:type", content: "article" }, { property: "og:url", content: url },
      { property: "og:locale", content: en ? "en_US" : "es_ES" },
      { property: "article:published_time", content: p.date }, { name: "twitter:card", content: "summary" },
    ],
    links: langLinks(lang, p.to, p.toEn),
    scripts: [{ type: "application/ld+json", children: JSON.stringify([
      { "@context": "https://schema.org", "@type": "BlogPosting", headline: title, description: d, inLanguage: lang, datePublished: p.date, mainEntityOfPage: url, author: { "@type": "Organization", name: en ? AUTHORS[p.author].nameEn : AUTHORS[p.author].name }, publisher: { "@type": "Organization", name: "Boveda Technologies", logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` } } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: en ? "Home" : "Inicio", item: `${SITE_URL}${en ? "/en" : "/"}` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}${en ? "/en/blog" : "/blog"}` },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ] },
    ]) }],
  };
}

const fmt = (d: string, lang: Lang) => new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long", year: "numeric" });

export function BlogIndex() {
  const { lang } = useI18n(); const en = lang === "en";
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback="/" />
    <h1 className="mt-10 font-display text-3xl font-bold">Blog</h1>
    <p className="mt-3 text-muted-foreground">{en ? "Crypto trends and digital dollars, explained like a conversation between friends." : "Tendencias cripto y dólares digitales, explicados como una conversación entre amigos."}</p>
    <ul className="mt-8 space-y-3">{POSTS.map((p) => <li key={p.to}><Link to={en ? p.toEn : p.to} className="block rounded-2xl border border-border bg-card p-5 hover:border-primary">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{en ? p.categoryEn : p.category}</p>
      <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{en ? p.titleEn : p.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{en ? p.descEn : p.desc}</p>
      <p className="mt-3 text-xs text-muted-foreground">{fmt(p.date, lang)} · {en ? `${p.minutes} min read` : `${p.minutes} min de lectura`} · {en ? AUTHORS[p.author].nameEn : AUTHORS[p.author].name}</p>
    </Link></li>)}</ul>
  </main>;
}

export function PostLayout({ path, es, enBody }: { path: PostPath; es: ReactNode; enBody: ReactNode }) {
  const { lang } = useI18n(); const en = lang === "en"; const p = byPath(path);
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <BackButton fallback={blogIndexHref(lang)} />
    <nav aria-label={en ? "Breadcrumb" : "Migas de pan"} className="mt-8 text-xs text-muted-foreground"><Link to={en ? "/en" : "/"} className="hover:text-primary">{en ? "Home" : "Inicio"}</Link> / <Link to={blogIndexHref(lang)} className="hover:text-primary">Blog</Link></nav>
    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">{en ? p.categoryEn : p.category}</p>
    <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{en ? p.titleEn : p.title}</h1>
    <AuthorLine id={p.author} date={fmt(p.date, lang)} minutes={p.minutes} en={en} />
    <article className="mt-8 space-y-6 text-base leading-8 text-foreground/90 [&_h2]:mb-2 [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline">{en ? enBody : es}</article>
    <section className="mt-10 rounded-2xl border border-primary/30 bg-primary/10 p-6">
      <h2 className="font-display text-lg font-semibold">{en ? "Try it at your own pace" : "Pruébalo a tu ritmo"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{en ? "Open your dollar wallet in a minute with Google and start small. Withdraw whenever you want." : "Abre tu billetera en dólares en un minuto con Google y empieza con poco. Retiras cuando quieras."}</p>
      <Link to={en ? "/en" : "/"} className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{en ? "Open my wallet" : "Abrir mi billetera"}</Link>
    </section>
    <p className="mt-8 text-xs text-muted-foreground">{en ? "Educational content, not financial advice. Vaults can lose capital and there are no guaranteed earnings." : "Contenido educativo, no es asesoría financiera. Las bóvedas pueden perder capital y no hay ganancias garantizadas."}</p>
  </main>;
}

function AuthorLine({ id, date, minutes, en }: { id: AuthorId; date: string; minutes: number; en: boolean }) {
  const a = AUTHORS[id];
  return <div className="mt-4 flex items-center gap-3">
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{a.initials}</span>
    <div className="text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">{en ? a.nameEn : a.name} <span className="font-normal text-muted-foreground">· {en ? a.roleEn : a.role}</span></p><p>{date} · {en ? `${minutes} min read` : `${minutes} min de lectura`}</p></div>
  </div>;
}
