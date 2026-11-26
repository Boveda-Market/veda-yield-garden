import { createFileRoute } from "@tanstack/react-router";
import { GettingStarted } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/en/get-started")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Create your account in 3 steps | Bóveda Market" },
    { name: "description", content: "Create your account with Google or email, get a new digital wallet linked to it, then open your vault or explore the app." },
    { property: "og:title", content: "Create your account in 3 steps | Bóveda Market" },
    { property: "og:description", content: "See how your account and wallet are created before you continue. Verify public pools any time." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("en", "/empezar", "/en/get-started") }),
  component: GettingStarted,
});