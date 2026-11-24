import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/clasica")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/clasica", title: "Gana en las subidas y en las bajadas | Bóveda Market", description: "Deposita dólares en una bóveda y cobra intereses de cada compra y venta del mercado. $0 por depositar y retiras cuando quieras.", alternates: { es: "/clasica", en: "/en/clasica" } }),
  component: () => <Landing variant={heroIndex("clasica")} />,
});
