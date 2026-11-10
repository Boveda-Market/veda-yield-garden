import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppExperience } from "@/components/app-experience";
import { hasTrialEntry } from "@/lib/trial-entry";

function TrialPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (hasTrialEntry()) setAllowed(true);
    else navigate({ to: "/", replace: true });
  }, [navigate]);
  return allowed ? <AppExperience guest /> : null;
}

export const Route = createFileRoute("/prueba")({ staticData: { sitemap: true }, head: () => ({ meta: [{ title: "Prueba sin cuenta — BÓVEDA" }, { name: "description", content: "Prueba BÓVEDA como invitado con 1,000 créditos ficticios, sin registro y sin mover dinero." }, { property: "og:title", content: "Prueba sin cuenta — BÓVEDA" }, { property: "og:description", content: "Explora depósitos, cosechas y tu portafolio con créditos ficticios." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { property: "og:url", content: "https://bovedamarket.app/prueba" },
  ], links: [{ rel: "canonical", href: "https://bovedamarket.app/prueba" }] }), component: TrialPage });
