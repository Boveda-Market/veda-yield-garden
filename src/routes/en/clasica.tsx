import { createFileRoute } from "@tanstack/react-router";
import { heroIndex } from "@/lib/hero-variants";
import { homeVariantHead } from "@/lib/home-variant-head";
import { Landing } from "../index";

export const Route = createFileRoute("/en/clasica")({ staticData: { sitemap: false },
  head: () => homeVariantHead({ path: "/en/clasica", title: "Earn on the way up and on the way down | Bóveda Market", description: "Deposit dollars in a vault and earn interest from every market buy and sell. $0 to deposit, withdraw anytime.", lang: "en", alternates: { es: "/clasica", en: "/en/clasica" } }),
  component: () => <Landing variant={heroIndex("clasica")} />,
});
