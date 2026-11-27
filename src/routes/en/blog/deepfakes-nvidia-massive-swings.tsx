import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/deepfakes-nvidia-swings-masivos";

export const Route = createFileRoute("/en/blog/deepfakes-nvidia-massive-swings")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/deepfakes-nvidia-swings-masivos"), component: Page });
