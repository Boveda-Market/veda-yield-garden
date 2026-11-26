import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/liquidez-concentrada";

export const Route = createFileRoute("/en/blog/concentrated-liquidity")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/liquidez-concentrada"), component: Page });
