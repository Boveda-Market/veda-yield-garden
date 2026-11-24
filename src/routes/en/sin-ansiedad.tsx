import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/sin-ansiedad")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/sin-ansiedad", title: "Open your vault and forget the charts | Bóveda Market", description: "At Bóveda, volatility pays you: every rise and fall leaves interest, and Autopilot handles the rest.", lang: "en", alternates: { es: "/sin-ansiedad", en: "/en/sin-ansiedad" } }),
  component: () => <Landing variant={heroIndex("sin-ansiedad")} />,
});
