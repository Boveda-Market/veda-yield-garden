import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/que-es-gta6-coin";

export const Route = createFileRoute("/en/blog/what-is-gta6-coin")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/que-es-gta6-coin"), component: Page });
