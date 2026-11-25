import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { langLinks } from "@/lib/seo-lang";
import { Landing } from "./index";

export const Route = createFileRoute("/interes-compuesto")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Interés compuesto y Piloto Automático | Bóveda Market" },
    { name: "description", content: "Descubre cómo reinvertir intereses puede generar nuevos intereses. Explora un simulador educativo y las reglas del Piloto Automático, con riesgos claros." },
    { property: "og:title", content: "Interés compuesto y Piloto Automático | Bóveda Market" },
    { property: "og:description", content: "Explora el efecto bola de nieve con un simulador educativo y conoce cuándo el Piloto Automático reinvierte. Sin ganancias garantizadas." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://bovedamarket.app/interes-compuesto" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("es", "/interes-compuesto", "/en/compound-interest") }),
  component: () => <Landing variant={heroIndex("interes-compuesto")} />,
});