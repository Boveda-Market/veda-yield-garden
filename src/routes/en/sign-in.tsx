import { createFileRoute } from "@tanstack/react-router";
import { AccountAccess } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/en/sign-in")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Access your account | Bóveda Market" },
    { name: "description", content: "Create an account or securely sign in to Bóveda Market with Google or email." },
    { property: "og:title", content: "Access your account | Bóveda Market" },
    { property: "og:description", content: "Secure access to your Bóveda Market account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("en", "/acceso", "/en/sign-in") }),
  component: AccountAccess,
});