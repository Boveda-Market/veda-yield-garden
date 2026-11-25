import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { langLinks } from "@/lib/seo-lang";
import { Landing } from "../index";

export const Route = createFileRoute("/en/compound-interest")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "Compound Interest and Autopilot | Bóveda Market" },
    { name: "description", content: "Discover how reinvested interest can earn more interest. Explore an educational calculator and Autopilot's market rules, with clear risk disclosures." },
    { property: "og:title", content: "Compound Interest and Autopilot | Bóveda Market" },
    { property: "og:description", content: "Explore the snowball effect with an educational calculator and learn when Autopilot reinvests. Returns are not guaranteed." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://bovedamarket.app/en/compound-interest" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: langLinks("en", "/interes-compuesto", "/en/compound-interest") }),
  component: () => <Landing variant={heroIndex("interes-compuesto")} />,
});