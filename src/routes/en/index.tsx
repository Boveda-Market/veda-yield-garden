import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import sharePreview from "@/assets/share/boveda_gta6_preview_en.jpg.asset.json";
import { Landing } from "../index";

const TITLE = "BÓVEDA — Digital dollar wallet (USDC) that earns interest";
const DESC = "Hold digital dollars (USDC), earn interest and withdraw to your bank or Cash App. Only you approve every move with your fingerprint or Face ID. Deposits are free.";
export const Route = createFileRoute("/en/")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: "Hold digital dollars (USDC), earn interest and withdraw to your bank or Cash App. Only you approve every move with your fingerprint or Face ID. Deposits are free." },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: `https://bovedamarket.app${sharePreview.url}` }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:image:alt", content: "GTA6 Vault — While everyone waits for the game, you earn like the house." }, { name: "twitter:image", content: `https://bovedamarket.app${sharePreview.url}` },
    { property: "og:url", content: "https://bovedamarket.app/en" },
  ], links: langLinks("en", "/", "/en"), scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: "BÓVEDA", url: "https://bovedamarket.app/en", applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "en", description: DESC, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }) }] }),
  component: Landing,
});
