import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/bitcoin")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/en/bitcoin", title: "Earn interest on Bitcoin without knowing crypto | Bóveda Market", description: "You already know Bitcoin: now make it pay you interest. Start with digital dollars, no weird coins to buy, and withdraw anytime.", lang: "en", alternates: { es: "/bitcoin", en: "/en/bitcoin" } }),
  component: () => <Landing variant={heroIndex("bitcoin")} />,
});
