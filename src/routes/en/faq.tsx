import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { shareMeta } from "@/lib/share-meta";
import { FaqPage } from "../faq";

const TITLE = "FAQ — Bóveda Market";
const DESC = "Answers about Double or Nothing, vaults, fees, withdrawals, sign-in and the affiliate program at Bóveda Market.";
export const Route = createFileRoute("/en/faq")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: "How Double or Nothing, vaults, fees and withdrawals work at Bóveda Market." },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, ...shareMeta("en"),
    { property: "og:url", content: "https://bovedamarket.app/en/faq" },
  ], links: langLinks("en", "/faq", "/en/faq") }),
  component: FaqPage,
});
