import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import sharePreview from "@/assets/share/boveda_gta6_preview_en.jpg.asset.json";
import { Landing } from "../index";

const TITLE = "BÓVEDA — Digital account to earn interest with digital currencies";
const DESC = "Create a digital account with Google, add funds and earn interest with digital currencies in vaults like GTA6 Coin and Trump Coin. Secured by Privy, free deposits.";
export const Route = createFileRoute("/en/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: `https://bovedamarket.app${sharePreview.url}` }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:image:alt", content: "GTA6 Vault — While everyone waits for the game, you earn like the house." }, { name: "twitter:image", content: `https://bovedamarket.app${sharePreview.url}` },
    { property: "og:url", content: "https://bovedamarket.app/en" },
  ], links: langLinks("en", "/", "/en"), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebApplication", name: "BÓVEDA", url: "https://bovedamarket.app/en", applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "en", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }, { "@type": "HowTo", name: "How to get started with BÓVEDA", inLanguage: "en", step: [{ "@type": "HowToStep", position: 1, name: "Create a digital account", text: "Create a digital account with your Google email, protected by Privy." }, { "@type": "HowToStep", position: 2, name: "Add funds", text: "Add digital dollars to your digital account." }, { "@type": "HowToStep", position: 3, name: "Earn interest", text: "Earn interest in a vault or join real-time rounds." }] }] }) }] }),
  component: Landing,
});
