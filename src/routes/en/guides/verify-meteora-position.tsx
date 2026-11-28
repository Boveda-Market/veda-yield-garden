import { createFileRoute } from "@tanstack/react-router";
import { DefiPositionGuide } from "@/components/defi-position-guide";
import { guideHeadEn } from "@/components/guide-layout";

export const Route = createFileRoute("/en/guides/verify-meteora-position")({
  staticData: { sitemap: true },
  head: () => guideHeadEn("/guias/verificar-posicion-meteora"),
  component: DefiPositionGuide,
});