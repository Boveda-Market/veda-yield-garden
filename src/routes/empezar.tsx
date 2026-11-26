import { createFileRoute } from "@tanstack/react-router";
import { GettingStarted } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/empezar")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Crea tu cuenta en 3 pasos | Bóveda Market" },
    { name: "description", content: "Crea tu cuenta con Google o email, se abre una billetera digital nueva enlazada a tu cuenta y luego abres tu bóveda o exploras la app." },
    { property: "og:title", content: "Crea tu cuenta en 3 pasos | Bóveda Market" },
    { property: "og:description", content: "Mira cómo se crean tu cuenta y tu billetera antes de continuar. Verifica los pools públicos cuando quieras." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("es", "/empezar", "/en/get-started") }),
  component: GettingStarted,
});