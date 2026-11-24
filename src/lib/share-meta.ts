import { SITE_URL } from "@/lib/seo-lang";
import previewEs from "@/assets/share/boveda_bitcoin_preview_es.jpg.asset.json";
import previewEn from "@/assets/share/boveda_bitcoin_preview_en.jpg.asset.json";

const ALT_ES = "Bóveda Bitcoin — Ya conoces Bitcoin. Ahora haz que te pague intereses.";
const ALT_EN = "Bitcoin Vault — You already know Bitcoin. Now make it pay you interest.";

/**
 * Banner that appears when a link is shared: the Bitcoin vault card, in the page's language.
 * Used by every public page so any shared link shows the same recognizable card.
 */
export function shareMeta(lang: "es" | "en") {
  const img = lang === "en" ? previewEn : previewEs;
  const alt = lang === "en" ? ALT_EN : ALT_ES;
  const url = SITE_URL + img.url;
  return [
    { property: "og:image", content: url },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: url },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
