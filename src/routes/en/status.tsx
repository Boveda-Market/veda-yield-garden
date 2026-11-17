import { createFileRoute } from "@tanstack/react-router";
import { langLinks } from "@/lib/seo-lang";
import { useT } from "@/lib/i18n";
import { LegalLayout } from "@/components/legal-layout";
import { SystemStatusView } from "@/components/system-status";

const TITLE = "System status — BÓVEDA";
const DESC = "Check live that BÓVEDA services are running, with global liquidity and fees for vaults and predictions.";
export const Route = createFileRoute("/en/status")({ staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: "Live services, total liquidity and fees paid, refreshed every minute." },
    { property: "og:locale", content: "en_US" }, { property: "og:locale:alternate", content: "es_ES" },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { property: "og:url", content: "https://bovedamarket.app/en/status" },
  ], links: langLinks("en", "/status", "/en/status") }),
  component: StatusPage,
});

function StatusPage() {
  const t = useT();
  return <LegalLayout title={t("Estado del sistema")} legal={false}><SystemStatusView /></LegalLayout>;
}
