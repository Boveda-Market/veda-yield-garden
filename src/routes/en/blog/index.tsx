import { createFileRoute } from "@tanstack/react-router";
import { BlogIndex, blogIndexHead } from "@/components/blog-layout";

export const Route = createFileRoute("/en/blog/")({ staticData: { sitemap: true }, head: () => blogIndexHead("en"), component: BlogIndex });
