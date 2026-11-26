import { createFileRoute } from "@tanstack/react-router";
import { GettingStarted } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/empezar")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Cómo empezar y cómo funciona | Bóveda Market" },
    { name: "description", content: "Conoce las bóvedas inteligentes, el Piloto Automático y los riesgos antes de crear tu cuenta en Bóveda Market." },
    { property: "og:title", content: "Cómo empezar y cómo funciona | Bóveda Market" },
    { property: "og:description", content: "Descubre cómo se reinvierten los intereses y verifica los pools públicos antes de entrar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("es", "/empezar", "/en/get-started") }),
  component: GettingStarted,
});