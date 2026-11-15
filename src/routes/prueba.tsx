import { createFileRoute, redirect } from "@tanstack/react-router";

// The guest demo was removed; old links land on the home page.
export const Route = createFileRoute("/prueba")({ staticData: { sitemap: false }, beforeLoad: () => { throw redirect({ to: "/", replace: true }); } });
