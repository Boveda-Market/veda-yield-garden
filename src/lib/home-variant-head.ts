import { SITE_URL } from "@/lib/seo-lang";

/** Head for a home version at its own address (/bitcoin, /gta6…): self canonical, own title/description. */
export function homeVariantHead(o: { path: string; title: string; description: string; lang?: "es" | "en"; alternates?: { es: string; en: string }; image?: { url: string; alt: string } }) {
  const url = SITE_URL + o.path;
  const en = o.lang === "en";
  const links: { rel: string; href: string; hrefLang?: string }[] = [{ rel: "canonical", href: url }];
  if (o.alternates) links.push({ rel: "alternate", hrefLang: "es", href: SITE_URL + o.alternates.es }, { rel: "alternate", hrefLang: "en", href: SITE_URL + o.alternates.en }, { rel: "alternate", hrefLang: "x-default", href: SITE_URL + o.alternates.es });
  return {
    meta: [
      { title: o.title }, { name: "description", content: o.description },
      { property: "og:title", content: o.title }, { property: "og:description", content: o.description },
      { property: "og:type", content: "website" }, { property: "og:url", content: url },
      { property: "og:locale", content: en ? "en_US" : "es_ES" }, { name: "twitter:card", content: "summary_large_image" },
      // Sharing this page shows its own banner instead of a blank card.
      ...(o.image ? [{ property: "og:image", content: SITE_URL + o.image.url }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:image:alt", content: o.image.alt }, { name: "twitter:image", content: SITE_URL + o.image.url }] : []),
    ],
    links,
  };
}
