import { langLinks } from "@/lib/seo-lang";
import { createFileRoute } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";
import { SystemStatusView } from "@/components/system-status";

export const Route = createFileRoute("/status")({ staticData: { sitemap: true },
  validateSearch: (s: Record<string, unknown>): { from?: "transparencia" } => (s["from"] === "transparencia" ? { from: "transparencia" } : {}),
  head: () => ({ meta: [
    { title: "Estado del sistema — Bóveda Market" },
    { name: "description", content: "Comprueba en vivo que los servicios de Bóveda Market están operativos, con la liquidez y comisiones globales de bóvedas y predicciones." },
    { property: "og:title", content: "Estado del sistema — Bóveda Market" },
    { property: "og:description", content: "Servicios en vivo, liquidez total y comisiones pagadas, actualizados cada minuto." },
    { property: "og:locale", content: "es_ES" }, { property: "og:locale:alternate", content: "en_US" }, { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/status" },
  ], links: langLinks("es", "/status", "/en/status") }),
  component: StatusPage,
});

function StatusPage() {
  const t = useT();
  const { from } = Route.useSearch();
  return <LegalLayout title={t("Estado del sistema")} legal={false} backHash={from}><SystemStatusView /></LegalLayout>;
}
