import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { Privacy } from "../privacidad";

const TITLE = "Privacy policy — BÓVEDA";
const DESC = "How BÓVEDA handles sign-in, your account data and what is publicly visible on the network.";
export const Route = createFileRoute("/en/privacy")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: "Privacy at BÓVEDA: wallets, account data, consent and your rights." },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/en/privacy" },
  ], links: langLinks("en", "/privacidad", "/en/privacy") }),
  component: Privacy,
});
