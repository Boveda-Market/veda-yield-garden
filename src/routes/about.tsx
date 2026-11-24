import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/about-page";
import { langLinks } from "@/lib/seo-lang";
import { shareMeta } from "@/lib/share-meta";

const title = "Sobre Bóveda Market — Proyecto y desarrollo";
const description = "Conoce por qué existe Bóveda Market, sus principios y el contacto de desarrollo @whalewatcherpro en Telegram.";
export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { property: "og:locale", content: "es_ES" },
    ...shareMeta("es"),
  ], links: langLinks("es", "/about", "/en/about") }),
  component: AboutPage,
});