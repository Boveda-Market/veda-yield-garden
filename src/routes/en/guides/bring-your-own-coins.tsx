import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/trae-tus-monedas";

export const Route = createFileRoute("/en/guides/bring-your-own-coins")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/trae-tus-monedas"), component: Page });
