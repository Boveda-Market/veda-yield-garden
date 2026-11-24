import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "./index";

export const Route = createFileRoute("/doble-o-nada")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/doble-o-nada", title: "Doble o Nada: ¿sube o baja Bitcoin? Rondas en vivo | Bóveda Market", description: "Rondas de 5 minutos, 15 minutos y 4 horas sobre Bitcoin, Ethereum y Solana. Juegas en dólares, sin comprar la moneda.", alternates: { es: "/doble-o-nada", en: "/en/doble-o-nada" } }),
  component: () => <Landing variant={heroIndex("doble-o-nada")} />,
});
