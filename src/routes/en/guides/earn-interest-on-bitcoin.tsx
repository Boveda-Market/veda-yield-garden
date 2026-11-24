import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/ganar-intereses-bitcoin";

export const Route = createFileRoute("/en/guides/earn-interest-on-bitcoin")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/ganar-intereses-bitcoin"), component: Page });
