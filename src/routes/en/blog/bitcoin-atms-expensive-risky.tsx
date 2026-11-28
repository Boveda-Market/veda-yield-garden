import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/bitcoin-atms-forma-cara-riesgosa";

export const Route = createFileRoute("/en/blog/bitcoin-atms-expensive-risky")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/bitcoin-atms-forma-cara-riesgosa"), component: Page });
