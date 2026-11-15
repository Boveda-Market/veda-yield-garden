export const THEME_KEY = "boveda-theme";
export type Theme = "dark" | "light";

export function resolveTheme(saved: string | null): Theme {
  return saved === "dark" ? "dark" : "light";
}

/** Apply the same default before first paint, including when storage is unavailable. */
export const THEME_BOOT = `var t="light";try{t=(${resolveTheme.toString()})(localStorage.getItem("${THEME_KEY}"))}catch(e){}document.documentElement.classList.toggle("light",t==="light");`;