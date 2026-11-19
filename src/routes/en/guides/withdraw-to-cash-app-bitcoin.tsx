import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/retirar-cash-app-bitcoin";

export const Route = createFileRoute("/en/guides/withdraw-to-cash-app-bitcoin")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/retirar-cash-app-bitcoin"), component: Page });
