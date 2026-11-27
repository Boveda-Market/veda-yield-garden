import { createFileRoute } from "@tanstack/react-router";
import { guideHeadEn } from "@/components/guide-layout";
import { Page } from "../../guias/bitcoin-coinbase-cash-app";

export const Route = createFileRoute("/en/guides/bitcoin-coinbase-cash-app")({ staticData: { sitemap: true }, head: () => guideHeadEn("/guias/bitcoin-coinbase-cash-app"), component: Page });
