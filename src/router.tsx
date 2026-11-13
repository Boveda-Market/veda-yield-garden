import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { installDomGuard } from "./lib/dom-guard";

// Client-only: keeps translator/extension DOM edits from crashing React with a blank screen.
if (typeof window !== "undefined") installDomGuard();

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    // Start loading the next screen as soon as a finger/pointer touches a link.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  return router;
};
