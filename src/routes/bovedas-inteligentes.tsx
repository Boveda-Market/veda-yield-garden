import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/bovedas-inteligentes")({ staticData: { sitemap: true },
  head: () => homeVariantHead({ path: "/bovedas-inteligentes", title: "Bóvedas inteligentes: aporta liquidez sin rebalancear a mano | Bóveda Market", description: "Olvídate de calcular rangos y rebalancear a mano. Pon tus dólares digitales a aportar liquidez y el Piloto Automático cobra las comisiones por ti.", alternates: { es: "/bovedas-inteligentes", en: "/en/smart-vaults" } }),
  component: () => <Landing variant={heroIndex("bovedas-inteligentes")} />,
});
