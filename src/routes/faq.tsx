import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "Preguntas frecuentes — BÓVEDA" },
    { name: "description", content: "Respuestas sobre Privy, Phantom, Jupiter Wallet, bóvedas, estadísticas, cargos del 1% y la demostración de BÓVEDA." },
    { property: "og:title", content: "Preguntas frecuentes — BÓVEDA" },
    { property: "og:description", content: "Acceso con wallets, privacidad y operaciones simuladas de BÓVEDA: resuelve tus dudas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FaqPage,
});

function FaqPage() {
  return <LegalLayout title="Preguntas frecuentes" legal={false}><Faq /></LegalLayout>;
}