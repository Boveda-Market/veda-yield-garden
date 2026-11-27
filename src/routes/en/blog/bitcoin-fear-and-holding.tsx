import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/miedo-caida-bitcoin-holdear";

export const Route = createFileRoute("/en/blog/bitcoin-fear-and-holding")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/miedo-caida-bitcoin-holdear"), component: Page });
