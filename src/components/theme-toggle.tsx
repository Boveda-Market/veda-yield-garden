import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export const THEME_KEY = "boveda-theme";
type Theme = "dark" | "light";

function apply(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f5f0" : "#0b0d0c");
}

/** Day / night switch: remembers the choice in this browser; dark is the default. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"); }, []);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => { setTheme(next); apply(next); try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ } }}
      aria-label={next === "light" ? t("Modo día") : t("Modo noche")}
      title={next === "light" ? t("Modo día") : t("Modo noche")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary ${className}`}
    >
      {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
      <span>{next === "light" ? t("Día") : t("Noche")}</span>
    </button>
  );
}
