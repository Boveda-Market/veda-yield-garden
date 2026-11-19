import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/que-es-usdc";

export const Route = createFileRoute("/en/guides/what-is-usdc")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/que-es-usdc"), component: Page });
