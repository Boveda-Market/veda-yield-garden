import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/bring-your-coins")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/en/bring-your-coins", title: "Bring your coins and put Autopilot to work | Bóveda Market", description: "Bring your own SOL, dollars or coins. Bóveda Market connects them to public vault liquidity and Autopilot rebalances for you.", lang: "en", alternates: { es: "/trae-tus-monedas", en: "/en/bring-your-coins" } }),
  component: () => <Landing variant={heroIndex("trae-tus-monedas")} />,
});
