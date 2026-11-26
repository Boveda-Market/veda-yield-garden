import { createFileRoute } from "@tanstack/react-router";
import { GettingStarted } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/en/get-started")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Getting started and how it works | Bóveda Market" },
    { name: "description", content: "Learn about smart vaults, Autopilot and risks before creating your Bóveda Market account." },
    { property: "og:title", content: "Getting started and how it works | Bóveda Market" },
    { property: "og:description", content: "Discover how interest is reinvested and verify public pools before signing in." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("en", "/empezar", "/en/get-started") }),
  component: GettingStarted,
});