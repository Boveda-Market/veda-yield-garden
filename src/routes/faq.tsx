import { useT } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/faq")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Preguntas frecuentes — BÓVEDA" },
    { name: "description", content: "Respuestas sobre Doble o Nada, bóvedas, comisiones, retiros, acceso y afiliados en BÓVEDA." },
    { property: "og:title", content: "Preguntas frecuentes — BÓVEDA" },
    { property: "og:description", content: "Cómo funcionan Doble o Nada, las bóvedas, las comisiones y los retiros en BÓVEDA." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/faq" },
  ], links: [{ rel: "canonical", href: "https://bovedamarket.app/faq" }] }),
  component: FaqPage,
});

function FaqPage() {
  const t = useT();
  return <LegalLayout title={t("Preguntas frecuentes")} legal={false} footer={false}><Faq /></LegalLayout>;
}