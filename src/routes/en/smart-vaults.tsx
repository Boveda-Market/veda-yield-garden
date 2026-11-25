import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/smart-vaults")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/en/smart-vaults", title: "Smart vaults: provide liquidity without manual rebalancing | Bóveda Market", description: "Forget calculating ranges and rebalancing by hand. Put your digital dollars to work providing liquidity while Autopilot collects the fees for you.", lang: "en", alternates: { es: "/bovedas-inteligentes", en: "/en/smart-vaults" } }),
  component: () => <Landing variant={heroIndex("bovedas-inteligentes")} />,
});
