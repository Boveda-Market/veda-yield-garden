import { createFileRoute } from "@tanstack/react-router";
import { postHead } from "@/components/blog-layout";
import { Page } from "../../blog/dolares-digitales-en-el-celular";

export const Route = createFileRoute("/en/blog/digital-dollars-on-your-phone")({ staticData: { sitemap: true }, head: () => postHead("en", "/blog/dolares-digitales-en-el-celular"), component: Page });
