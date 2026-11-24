import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/gta6")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/gta6", title: "GTA6 Coin Vault: interest from market volume | Bóveda Market", description: "Up or down, every GTA6 Coin buy and sell leaves interest. Autopilot adjusts your vault and alerts you on Telegram.", lang: "en", alternates: { es: "/gta6", en: "/en/gta6" } }),
  component: () => <Landing variant={heroIndex("gta6")} />,
});
