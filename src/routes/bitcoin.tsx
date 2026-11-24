import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/bitcoin")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/bitcoin", title: "Gana intereses con Bitcoin sin saber de cripto | Bóveda Market", description: "Ya conoces Bitcoin: ahora haz que te pague intereses. Empieza con dólares digitales, sin comprar monedas raras, y retira cuando quieras.", alternates: { es: "/bitcoin", en: "/en/bitcoin" } }),
  component: () => <Landing variant={heroIndex("bitcoin")} />,
});
