import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/doble-o-nada")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/doble-o-nada", title: "Double or Nothing: will Bitcoin go up or down? Live rounds | Bóveda Market", description: "5-minute, 15-minute and 4-hour rounds on Bitcoin, Ethereum and Solana. Play in dollars, no coin to buy.", lang: "en", alternates: { es: "/doble-o-nada", en: "/en/doble-o-nada" } }),
  component: () => <Landing variant={heroIndex("doble-o-nada")} />,
});
