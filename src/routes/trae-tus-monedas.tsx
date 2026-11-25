import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/trae-tus-monedas")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/trae-tus-monedas", title: "Trae tus monedas y pon el Piloto Automático a trabajar | Bóveda Market", description: "Trae tu propio SOL, dólares o monedas. Bóveda Market las conecta con la liquidez de bóvedas públicas y el Piloto Automático rebalancea por ti.", alternates: { es: "/trae-tus-monedas", en: "/en/bring-your-coins" } }),
  component: () => <Landing variant={heroIndex("trae-tus-monedas")} />,
});
