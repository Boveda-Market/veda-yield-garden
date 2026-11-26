import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { InstallAppButton } from "@/components/install-app";

/** App-shell footer only; public home variants keep their separate footer. */
export function AppFooterLinks() {
  const { lang, t } = useI18n();
  const link = "inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline";
  return <nav className="mt-3 flex flex-wrap gap-x-5 text-primary">
    <Link to={lang === "en" ? "/en/faq" : "/faq"} className={link}>{t("Preguntas frecuentes")}</Link>
    <Link to={lang === "en" ? "/en/guides" : "/guias"} className={link}>{t("Guías")}</Link>
    <Link to={lang === "en" ? "/en/about" : "/about"} className={link}>{t("Sobre Bóveda Market")}</Link>
    <Link to="/status" className={link}>{t("Estado del sistema")}</Link>
    <Link to={lang === "en" ? "/en/terms" : "/terminos"} className={link}>{t("Términos y condiciones")}</Link>
    <Link to={lang === "en" ? "/en/privacy" : "/privacidad"} className={link}>{t("Política de privacidad")}</Link>
    <InstallAppButton className={link} />
    <a href="mailto:admin@bovedamarket.app" className={link}>admin@bovedamarket.app</a>
  </nav>;
}