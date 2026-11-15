import "../lib/buffer-polyfill";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
  useRouterState,
} from "@tanstack/react-router";

const APP_PATHS = ["/app", "/portfolio", "/mercados", "/wallet", "/invita", "/cuenta", "/seguridad", "/notificaciones", "/actividad", "/prueba"];
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isChunkLoadError, reloadForNewVersion } from "../lib/lazy-reload";
import { LanguageProvider } from "../lib/i18n";
import { LanguageMenu } from "../components/language-menu";
import { ThemeToggle } from "../components/theme-toggle";
import { GoogleAnalytics } from "../components/google-analytics";
import { Toaster } from "../components/ui/sonner";
import { REF_STORAGE_KEY, normalizeCode } from "../lib/affiliate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b0d0c" },
      { name: "google-site-verification", content: "Y2kXe30nuZ-9oRhJr3vJImNAM6JqMbCDl5_3nuAcUdE" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Manrope:wght@400;500;600&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const CHUNK_GUARD = `(function(){var K="boveda-chunk-reload",R=/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|No factory registered for module/i;function h(e){var m=e&&(e.reason||e.error||e);m=m&&m.message?m.message:String(e&&e.message||m||"");if(!R.test(m))return;try{var l=Number(sessionStorage.getItem(K)||0);if(Date.now()-l<30000)return;sessionStorage.setItem(K,String(Date.now()))}catch(_){}location.reload()}addEventListener("unhandledrejection",h);addEventListener("error",h,true)})();`;

const THEME_BOOT = `try{if(localStorage.getItem("boveda-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Runs before the app bundle: if an outdated page asks for files from a previous build (blank screen), refresh once. */}
        <script dangerouslySetInnerHTML={{ __html: CHUNK_GUARD }} />
        {/* Apply the saved day/night choice before paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const code = normalizeCode(new URLSearchParams(window.location.search).get("ref"));
    if (code) localStorage.setItem(REF_STORAGE_KEY, code);
  }, []);
  useEffect(() => {
    // After an app update, old pages may request files that no longer exist: refresh once to get the new version.
    const onPreloadError = (event: Event) => { if (reloadForNewVersion()) event.preventDefault(); };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <GoogleAnalytics />
        <Toaster />
        {!APP_PATHS.includes(pathname) && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
            <ThemeToggle className="shadow-lg" />
            <LanguageMenu className="shadow-lg" />
          </div>
        )}
      </LanguageProvider>
    </QueryClientProvider>
  );
}
