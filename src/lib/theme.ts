export const THEME_KEY = "boveda-theme";
export type Theme = "dark" | "light";

/** Browser/status-bar color per mode; matches each mode's --background. */
export const THEME_COLORS: Record<Theme, string> = { light: "#f7f7f3", dark: "#090c0a" };

export function resolveTheme(saved: string | null): Theme {
  return saved === "dark" ? "dark" : "light";
}

/**
 * Apply the same default before first paint, including when storage is unavailable.
 * Also owns the single theme-color meta so the phone's top bar matches the chosen mode.
 */
export const THEME_BOOT = `var t="light";try{t=(${resolveTheme.toString()})(localStorage.getItem("${THEME_KEY}"))}catch(e){}document.documentElement.classList.toggle("light",t==="light");try{var c=${JSON.stringify(THEME_COLORS)}[t],m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m)}m.setAttribute("content",c)}catch(e){}`;

/** Switch mode at runtime (selector) and keep the top bar color in sync. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", THEME_COLORS[theme]);
}
