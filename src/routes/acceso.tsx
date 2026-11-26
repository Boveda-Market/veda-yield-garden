import { createFileRoute } from "@tanstack/react-router";
import { AccountAccess } from "@/components/home-onboarding";
import { langLinks } from "@/lib/seo-lang";

export const Route = createFileRoute("/acceso")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Accede a tu cuenta | Bóveda Market" },
    { name: "description", content: "Crea tu cuenta o inicia sesión de forma segura en Bóveda Market con Google o email." },
    { property: "og:title", content: "Accede a tu cuenta | Bóveda Market" },
    { property: "og:description", content: "Acceso seguro a tu cuenta de Bóveda Market." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("es", "/acceso", "/en/sign-in") }),
  component: AccountAccess,
});