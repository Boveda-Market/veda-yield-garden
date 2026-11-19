import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/invertir-sin-estafas";

export const Route = createFileRoute("/en/guides/avoid-investment-scams")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/invertir-sin-estafas"), component: Page });
