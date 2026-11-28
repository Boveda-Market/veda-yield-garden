import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/gta6")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/gta6", title: "Hold GTA6 Coin, earn interest | Bóveda Market", description: "We open a concentrated liquidity position. Autopilot keeps it in range, rebalances and auto-compounds for you. Interest is variable; you can lose capital.", lang: "en", alternates: { es: "/gta6", en: "/en/gta6" } }),
  component: () => <Landing variant={heroIndex("gta6")} />,
});
