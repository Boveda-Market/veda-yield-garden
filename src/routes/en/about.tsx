import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/about-page";
import { langLinks } from "@/lib/seo-lang";
import { shareMeta } from "@/lib/share-meta";

const title = "About Bóveda Market — Project and development";
const description = "Learn why Bóveda Market exists, what guides it and how to contact developer @whalewatcherpro on Telegram.";
export const Route = createFileRoute("/en/about")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { property: "og:locale", content: "en_US" },
    ...shareMeta("en"),
  ], links: langLinks("en", "/about", "/en/about") }),
  component: AboutPage,
});