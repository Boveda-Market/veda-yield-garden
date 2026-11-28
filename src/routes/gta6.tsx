import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/gta6")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/gta6", title: "Hold GTA6 Coin, gana intereses | Bóveda Market", description: "Abrimos una posición de liquidez concentrada. El Piloto Automático la mantiene en rango, rebalancea y hace auto-compound por ti. Intereses variables; puedes perder capital.", alternates: { es: "/gta6", en: "/en/gta6" } }),
  component: () => <Landing variant={heroIndex("gta6")} />,
});
