import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "Preguntas frecuentes — BÓVEDA" },
    { name: "description", content: "Respuestas sobre Real y Prueba, 1,000 créditos, wallets, USDC, cargo del 1%, conversiones y disponibilidad en BÓVEDA." },
    { property: "og:title", content: "Preguntas frecuentes — BÓVEDA" },
    { property: "og:description", content: "Real y Prueba en BÓVEDA: créditos ficticios, acceso con wallets, cargos y operaciones en la red." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FaqPage,
});

function FaqPage() {
  return <LegalLayout title="Preguntas frecuentes" legal={false}><Faq /></LegalLayout>;
}