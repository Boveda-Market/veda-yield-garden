// Public pages exist in Spanish (main) and English (/en/...). Every version points to itself as
// canonical and lists both language versions so Google shows the one matching the searcher.
export const SITE_URL = "https://bovedamarket.app";
export type PageLang = "es" | "en";

export function langLinks(current: PageLang, esPath: string, enPath: string) {
  const es = SITE_URL + esPath, en = SITE_URL + enPath;
  return [
    { rel: "canonical", href: current === "es" ? es : en },
    { rel: "alternate", hrefLang: "es", href: es },
    { rel: "alternate", hrefLang: "en", href: en },
    { rel: "alternate", hrefLang: "x-default", href: es },
  ];
}

/** Pages under /en always open in English, whatever language was saved before. */
export function isEnglishPath(pathname: string) {
  return pathname === "/en" || pathname.startsWith("/en/");
}
