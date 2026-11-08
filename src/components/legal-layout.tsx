import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function LegalLayout({ title, children, legal = true }: { title: string; children: ReactNode; legal?: boolean }) {
  const t = useT();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 text-foreground">
    <Button asChild variant="ghost"><Link to="/"><ArrowLeft />{t("Volver al inicio")}</Link></Button>
    <Link to="/" aria-label={t("BÓVEDA · Ir al inicio")} className="mt-10 flex items-center gap-3 font-display text-lg font-bold"><img src="/icon-512.png" alt="" className="h-9 w-9 rounded-lg" />BÓVEDA</Link>
    <p className="mt-2 text-xs text-muted-foreground">Boveda Technologies LLC</p>
    <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{legal ? t("Vigente desde el") : t("Actualizado el")} {t("8 de noviembre de 2026")}</p>
    <article className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">{children}</article>
    <nav className="mt-10 flex flex-wrap gap-5 border-t border-border pt-5 text-sm text-primary"><Link to="/faq">{t("Preguntas frecuentes")}</Link><Link to="/terminos">{t("Términos y condiciones")}</Link><Link to="/privacidad">{t("Política de privacidad")}</Link></nav>
  </main>;
}
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 font-display text-lg font-semibold text-foreground">{title}</h2>{children}</section>;
}