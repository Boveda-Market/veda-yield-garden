import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/gta6")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/gta6", title: "Bóveda GTA6 Coin: intereses del volumen del mercado | Bóveda Market", description: "Suba o baje GTA6 Coin, cada compra y venta deja intereses. El Piloto Automático ajusta tu bóveda y te avisa por Telegram.", alternates: { es: "/gta6", en: "/en/gta6" } }),
  component: () => <Landing variant={heroIndex("gta6")} />,
});
