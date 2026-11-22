import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { Terms } from "../terminos";

const TITLE = "Terms and conditions — Bóveda Market";
const DESC = "Bóveda Market terms of use: access, availability, tiered fees, Double or Nothing and network risks.";
export const Route = createFileRoute("/en/terms")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: "Access, authorization, operating fees and risks at Bóveda Market." },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/en/terms" },
  ], links: langLinks("en", "/terminos", "/en/terms") }),
  component: Terms,
});
