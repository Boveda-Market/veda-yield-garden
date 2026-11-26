import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/meteora-historia-y-como-funciona";

export const Route = createFileRoute("/en/blog/meteora-history-and-how-it-works")({
  staticData: { sitemap: true },
  head: () => postHead("en", "/blog/meteora-historia-y-como-funciona"),
  component: Page,
});