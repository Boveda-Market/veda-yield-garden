import { createFileRoute } from "@tanstack/react-router";
import { BlogIndex, blogIndexHead } from "@/components/blog-layout";

export const Route = createFileRoute("/blog/")({ staticData: { sitemap: true }, head: () => blogIndexHead("es"), component: BlogIndex });
