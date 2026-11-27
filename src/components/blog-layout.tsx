import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Headset } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { useI18n, type Lang } from "@/lib/i18n";
import { SITE_URL, langLinks } from "@/lib/seo-lang";
import { BlogHero } from "@/components/blog-hero";

/** Two editorial voices: technical research and everyday/news. */
export const AUTHORS = {
  research: { name: "Investigación DeFi", nameEn: "DeFi Research", role: "Mercados y protocolos, en profundidad", roleEn: "Markets and protocols, in depth", initials: "ID" },
  sofia: { name: "Sofía Holdd", nameEn: "Sofía Holdd", role: "Ahorro y bóvedas inteligentes", roleEn: "Savings and smart vaults", initials: "SH" },
  editorial: { name: "Redacción Bóveda", nameEn: "Bóveda Editorial", role: "Ahorro, adopción y noticias del día a día", roleEn: "Savings, adoption and everyday news", initials: "RB" },
} as const;
export type AuthorId = keyof typeof AUTHORS;

/** Blog posts: friendly, conversational trend articles (guides stay evergreen how-tos). */
export const POSTS = [
  {
    to: "/blog/deepfakes-nvidia-swings-masivos", toEn: "/en/blog/deepfakes-nvidia-massive-swings", date: "2026-11-27", minutes: 5, author: "sofia",
    category: "Adopción y ahorro", categoryEn: "Adoption & savings",
    title: "Deepfakes, Nvidia y swings masivos: cómo ganar con la volatilidad sin volverte loco",
    titleEn: "Deepfakes, Nvidia and massive swings: how to profit from volatility without losing your mind",
    desc: "Yahoo Finanzas cuenta cómo el regreso de Jensen Huang a Nvidia desató videos falsos con IA, y Google se llena de nervios. Por qué las noticias sacuden los precios y cómo vivir esos sacudones con calma.",
    descEn: "Yahoo Finance reports how Jensen Huang's return to Nvidia unleashed AI deepfakes, and Google fills with nerves. Why news shakes prices and how to live through those swings calmly.",
  },
  {
    to: "/blog/hackeo-binance-llaves", toEn: "/en/blog/binance-hack-keys", date: "2026-11-27", minutes: 5, author: "sofia",
    category: "Adopción y ahorro", categoryEn: "Adoption & savings",
    title: "El hackeo de $1,000M a Binance: por qué darle tus llaves a otro siempre es una trampa",
    titleEn: "The $1B Binance hack: why handing your keys to someone else is always a trap",
    desc: "EE. UU. busca recuperar más de mil millones de dólares robados a Binance y Google se llena de «¿mi dinero está seguro?». Cómo una billetera propia cuida tu seguridad y tu privacidad.",
    descEn: "The US seeks to recover over a billion dollars stolen from Binance and Google fills with “is my money safe?”. How your own wallet protects your security and privacy.",
  },
  {
    to: "/blog/privacidad-bitcoin-35-centavos", toEn: "/en/blog/bitcoin-privacy-35-cents", date: "2026-11-27", minutes: 5, author: "sofia",
    category: "Adopción y ahorro", categoryEn: "Adoption & savings",
    title: "Tu dirección de casa por 35 centavos: la falla que expone el holdear a la antigua",
    titleEn: "Your home address for 35 cents: the flaw that exposes old-school holding",
    desc: "Yahoo Finanzas cuenta cómo un pago de centavos podría revelar la conexión de una billetera de Bitcoin, y Google se llena de dudas. Por qué guardar Bitcoin no debería exigirte ser técnico.",
    descEn: "Yahoo Finance reports how a payment of cents could reveal a Bitcoin wallet's connection, and Google fills with doubts. Why storing Bitcoin shouldn't require being a technician.",
  },
  {
    to: "/blog/miedo-caida-bitcoin-holdear", toEn: "/en/blog/bitcoin-fear-and-holding", date: "2026-11-27", minutes: 6, author: "sofia",
    category: "Adopción y ahorro", categoryEn: "Adoption & savings",
    title: "Bitcoin cae, Google se llena de miedo: por qué holdear a la antigua es el verdadero problema",
    titleEn: "Bitcoin drops, Google fills with fear: why old-school holding is the real problem",
    desc: "Yahoo Finanzas habla del peor mes desde 2022 y Google se llena de «¿Bitcoin se va a cero?». Qué puede pasar si sube o baja, y por qué esperar con el dinero quieto desgasta tanto.",
    descEn: "Yahoo Finance calls it the worst month since 2022 and Google fills with “Is Bitcoin going to zero?”. What can happen if it rises or falls, and why waiting with idle money wears you down.",
  },
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
  const [lead, ...rest] = POSTS;
  const meta = (p: (typeof POSTS)[number]) => `${en ? p.categoryEn : p.category} · ${en ? `${p.minutes} min` : `${p.minutes} min`}`;
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-6 text-foreground">
    <BackButton fallback="/" />
    <header className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-sofia)] p-[2px]"><span className="grid size-full place-items-center rounded-full bg-sofia-disc"><Headset className="size-5 text-sofia" strokeWidth={2.2} /></span></span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-sofia-text">{en ? "Sofía's column" : "La columna de Sofía"}</p>
        <h1 className="font-display text-2xl font-bold leading-tight">Blog</h1>
      </div>
    </header>
    <p className="mt-3 border-l-2 border-sofia-text/50 pl-3 text-sm italic leading-6 text-muted-foreground">{en ? "“News, opinion and trends, explained like a conversation between friends.” — Sofía Holdd" : "«Noticias, opinión y tendencias, explicadas como una conversación entre amigos.» — Sofía Holdd"}</p>
    {lead && <Link to={en ? lead.toEn : lead.to} className="mt-5 block rounded-2xl border border-sofia-text/30 bg-sofia-surface p-4 transition hover:border-sofia-text">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sofia-text">{en ? "Latest" : "Lo último"} · {meta(lead)}</p>
      <h2 className="mt-1.5 font-display text-xl font-bold leading-snug">{en ? lead.titleEn : lead.title}</h2>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{en ? lead.descEn : lead.desc}</p>
      <p className="mt-2 text-xs text-muted-foreground">{fmt(lead.date, lang)} · {en ? AUTHORS[lead.author].nameEn : AUTHORS[lead.author].name}</p>
    </Link>}
    <ul className="mt-2 divide-y divide-border">{rest.map((p) => <li key={p.to}><Link to={en ? p.toEn : p.to} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5">
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${p.author === "sofia" ? "text-sofia-text" : "text-muted-foreground"}`}>{meta(p)}</p>
        <h2 className="mt-0.5 font-display text-[15px] font-semibold leading-snug">{en ? p.titleEn : p.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{fmt(p.date, lang)} · {en ? AUTHORS[p.author].nameEn : AUTHORS[p.author].name}</p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-sofia-text" />
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
    <BlogHero path={p.to} en={en} />
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
