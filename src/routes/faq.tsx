import { langLinks } from "@/lib/seo-lang";
import { useT } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/faq")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Preguntas frecuentes — Bóveda Market" },
    { name: "description", content: "Respuestas sobre Doble o Nada, bóvedas, intereses, retiros, acceso y afiliados en Bóveda Market." },
    { property: "og:title", content: "Preguntas frecuentes — Bóveda Market" },
    { property: "og:description", content: "Cómo funcionan Doble o Nada, las bóvedas, los intereses y los retiros en Bóveda Market." },
    { property: "og:locale", content: "es_ES" }, { property: "og:locale:alternate", content: "en_US" }, { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/faq" },
  ], links: langLinks("es", "/faq", "/en/faq") }),
  component: FaqPage,
});

export function FaqPage() {
  const t = useT();
  return <LegalLayout title={t("Preguntas frecuentes")} legal={false} footer={false}><Faq /></LegalLayout>;
}