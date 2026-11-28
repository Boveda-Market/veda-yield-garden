import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/sitios-secretos-dinero-dolares-digitales";

export const Route = createFileRoute("/en/blog/secret-sites-make-money-digital-dollars")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/sitios-secretos-dinero-dolares-digitales"), component: Page });
