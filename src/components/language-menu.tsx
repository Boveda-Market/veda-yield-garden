import { Languages } from "lucide-react";
import { LANGS, useI18n } from "@/lib/i18n";

export function LanguageMenu({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs text-foreground ${className}`}>
      <Languages size={14} aria-hidden />
      <span className="sr-only">{t("Idioma")}</span>
      <select
        aria-label={t("Idioma")}
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        className="cursor-pointer bg-transparent outline-none"
      >
        {LANGS.map((l) => <option key={l.code} value={l.code} className="bg-card text-foreground">{l.label}</option>)}
      </select>
    </label>
  );
}
