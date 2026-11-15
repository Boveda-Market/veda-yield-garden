import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { applyTheme, resolveTheme, THEME_KEY, type Theme } from "@/lib/theme";

export { THEME_KEY } from "@/lib/theme";

/** Day / night switch: remembers the choice in this browser; light is the default. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* default when storage is blocked */ }
    setTheme(resolveTheme(saved));
  }, []);
  const next: Theme = theme === "light" ? "dark" : "light";
  return (
    <button
      type="button"
      onClick={() => { setTheme(next); applyTheme(next); try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ } }}
      aria-label={next === "light" ? t("Modo día") : t("Modo noche")}
      title={next === "light" ? t("Modo día") : t("Modo noche")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary ${className}`}
    >
      {theme === "light" ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
      <span>{next === "light" ? t("Día") : t("Noche")}</span>
    </button>
  );
}
