import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/sin-ansiedad")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/sin-ansiedad", title: "Abre tu bóveda y olvídate de las gráficas | Bóveda Market", description: "En Bóveda la volatilidad te paga: cada subida y cada bajada deja intereses, y el Piloto Automático se encarga del resto." }),
  component: () => <Landing variant={heroIndex("sin-ansiedad")} />,
});
