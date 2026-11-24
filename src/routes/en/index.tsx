import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { shareMeta } from "@/lib/share-meta";
import { Landing } from "../index";

const TITLE = "Bóveda Market — Digital account to earn interest with digital currencies";
const DESC = "Create a digital account with Google, add funds and earn interest with digital currencies in vaults like GTA6 Coin and Trump Coin. Secured by Privy, free deposits.";
export const Route = createFileRoute("/en/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" },
    ...shareMeta("en"),
    { property: "og:url", content: "https://bovedamarket.app/en" },
  ], links: langLinks("en", "/", "/en"), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebApplication", name: "Bóveda Market", url: "https://bovedamarket.app/en", applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "en", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }, { "@type": "HowTo", name: "How to get started with Bóveda Market", inLanguage: "en", step: [{ "@type": "HowToStep", position: 1, name: "Create a digital account", text: "Create a digital account with your Google email, protected by Privy." }, { "@type": "HowToStep", position: 2, name: "Add funds", text: "Add digital dollars to your digital account." }, { "@type": "HowToStep", position: 3, name: "Earn interest", text: "Earn interest in a vault or join real-time rounds." }, { "@type": "HowToStep", position: 4, name: "Track your earnings live", text: "From My Portfolio you see your balance, your earnings and what is ready to harvest." }] }] }) }] }),
  component: Landing,
});
