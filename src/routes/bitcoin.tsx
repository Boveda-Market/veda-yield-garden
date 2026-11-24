import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import sharePreview from "@/assets/share/boveda_bitcoin_preview_es.jpg.asset.json";
import { Landing } from "./index";

export const Route = createFileRoute("/bitcoin")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/bitcoin", title: "Gana intereses con Bitcoin sin saber de cripto | Bóveda Market", description: "Ya conoces Bitcoin: ahora haz que te pague intereses. Empieza con dólares digitales, sin comprar monedas raras, y retira cuando quieras.", alternates: { es: "/bitcoin", en: "/en/bitcoin" }, image: { url: sharePreview.url, alt: "Bóveda Bitcoin — Ya conoces Bitcoin. Ahora haz que te pague intereses." } }),
  component: () => <Landing variant={heroIndex("bitcoin")} />,
});
