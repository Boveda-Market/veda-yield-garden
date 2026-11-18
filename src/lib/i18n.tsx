import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "@/i18n/en";

export type Lang = "es" | "en";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];
const STORAGE_KEY = "boveda-lang";
const dictionaries: Record<Lang, Record<string, string>> = { es: {}, en };

/** Device language for visitors with no saved choice: English phones get English, everything else Spanish. */
export function detectDeviceLang(langs: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]): Lang {
  const first = langs.find((l) => /^(en|es)\b/i.test(l ?? ""));
  return first && /^en/i.test(first) ? "en" : "es";
}

type Vars = Record<string, string | number>;
export function translate(lang: Lang, text: string, vars?: Vars): string {
  let out = dictionaries[lang][text] ?? text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (text: string, vars?: Vars) => string };
const I18nContext = createContext<Ctx>({ lang: "es", setLang: () => {}, t: (s, v) => translate("es", s, v) });

export function LanguageProvider({ children, forced }: { children: ReactNode; forced?: Lang | undefined }) {
  const [lang, setLangState] = useState<Lang>(forced ?? "es");
  useEffect(() => {
    if (forced) { setLangState(forced); return; }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") { setLangState(saved); return; }
    // First visit (e.g. opening a shared link): follow the phone's language.
    if (detectDeviceLang() === "en") setLangState("en");
  }, [forced]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
export function useT() { return useContext(I18nContext).t; }
/** Locale for number/date formatting. */
export function useLocale() { return useContext(I18nContext).lang === "en" ? "en-US" : "es-ES"; }
