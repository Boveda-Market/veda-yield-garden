import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/trump")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/trump", title: "Bóveda Trump Coin: intereses en un mercado muy activo | Bóveda Market", description: "Trump Coin mueve volumen las 24 horas. La bóveda convierte esa actividad en intereses estimados en dólares, con retiro en cualquier momento." }),
  component: () => <Landing variant={heroIndex("trump")} />,
});
