import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/hackeo-binance-llaves";

export const Route = createFileRoute("/en/blog/binance-hack-keys")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/hackeo-binance-llaves"), component: Page });
