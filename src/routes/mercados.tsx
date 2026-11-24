import { createFileRoute } from "@tanstack/react-router";
import { AppExperience } from "@/components/app-experience";
import { shareMeta } from "@/lib/share-meta";
export const Route = createFileRoute("/mercados")({ staticData: { sitemap: false }, head: () => ({ meta: [{ title: "Predicciones — Bóveda Market" }, { name: "description", content: "Predice si Bitcoin, Ethereum o SOL sube o baja en rondas en vivo de 5 min, 15 min y 4 horas." }, { property: "og:title", content: "Predicciones — Bóveda Market" }, { property: "og:description", content: "Rondas Sube o Baja en vivo con USDC desde tu wallet." }, { property: "og:type", content: "website" }, ...shareMeta("es") ] }), component: () => <AppExperience view="markets" /> });
