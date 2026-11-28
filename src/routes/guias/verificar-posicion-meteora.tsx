import { createFileRoute } from "@tanstack/react-router";
import { DefiPositionGuide } from "@/components/defi-position-guide";
import { guideHead } from "@/components/guide-layout";

export const Route = createFileRoute("/guias/verificar-posicion-meteora")({
  staticData: { sitemap: true },
  head: () => guideHead({
    path: "/guias/verificar-posicion-meteora",
    title: "Cómo verificar y gestionar tu posición en Meteora fuera de Bóveda",
    description: "Guía DeFi avanzada: verifica tu posición on-chain sin exponer llaves y conoce la importación de billeteras, la gestión manual y cómo se mantiene el Piloto Automático.",
  }),
  component: DefiPositionGuide,
});