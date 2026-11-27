import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/privacidad-bitcoin-35-centavos";

export const Route = createFileRoute("/en/blog/bitcoin-privacy-35-cents")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/privacidad-bitcoin-35-centavos"), component: Page });
