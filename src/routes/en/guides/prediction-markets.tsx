import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/mercados-de-prediccion";

export const Route = createFileRoute("/en/guides/prediction-markets")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/mercados-de-prediccion"), component: Page });
