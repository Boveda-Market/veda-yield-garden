import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/trump")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/trump", title: "Trump Coin Vault: interest from a very active market | Bóveda Market", description: "Trump Coin trades 24 hours a day. The vault turns that activity into estimated dollar interest, and you can withdraw anytime.", lang: "en", alternates: { es: "/trump", en: "/en/trump" } }),
  component: () => <Landing variant={heroIndex("trump")} />,
});
