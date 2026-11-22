import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { GuidesIndex } from "../../guias/index";

const T = "Digital dollar (USDC) guides | Bóveda Market";
const D = "Clear guides on digital dollars (USDC): how to buy them with a card, withdraw them to Cash App or Bitcoin and protect yourself from scams.";
export const Route = createFileRoute("/en/guides/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D },
    { property: "og:title", content: "Digital dollar guides | Bóveda Market" }, { property: "og:description", content: D },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { property: "og:url", content: "https://bovedamarket.app/en/guides" },
  ], links: langLinks("en", "/guias", "/en/guides") }),
  component: GuidesIndex,
});
