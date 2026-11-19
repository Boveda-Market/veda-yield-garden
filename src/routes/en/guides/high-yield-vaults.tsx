import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/bovedas-alto-rendimiento";

export const Route = createFileRoute("/en/guides/high-yield-vaults")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/bovedas-alto-rendimiento"), component: Page });
