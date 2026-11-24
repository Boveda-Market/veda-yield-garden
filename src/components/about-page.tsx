import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Eye, MessageCircle, SlidersHorizontal } from "lucide-react";
import office from "@/assets/boveda-office.png.asset.json";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const PRINCIPLES = [
  { icon: Eye, title: "Claridad antes de confirmar", text: "El monto y el destino de tu dinero deben estar claros antes de dar el siguiente paso." },
  { icon: SlidersHorizontal, title: "Tú decides", text: "Tú eliges si empezar, cuánto poner y cuándo continuar. Los permisos de automatización se pueden desactivar." },
  { icon: MessageCircle, title: "Explicaciones sencillas", text: "No necesitas conocer cada término para hacer preguntas y entender tus opciones." },
] as const;

export function AboutPage() {
  const { t, lang } = useI18n();
  return <main className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center px-5 pb-5 pt-20 sm:px-8">
      <Button asChild variant="ghost" size="icon"><Link to={lang === "en" ? "/en" : "/"} aria-label={t("Ir al inicio")}><ArrowLeft /></Link></Button>
      <Link to={lang === "en" ? "/en" : "/"} className="ml-3" aria-label="Bóveda Market"><BrandLogo /></Link>
    </header>
    <section className="relative isolate flex min-h-[360px] items-end overflow-hidden sm:min-h-[460px]" aria-labelledby="about-title">
      <img src={office.url} alt={t("Persona trabajando de espaldas en una oficina; imagen ilustrativa.")} className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center] sm:object-center" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-bolt-ink/50" />
      <div className="mx-auto w-full max-w-5xl px-5 pb-8 pt-20 text-brand-foreground sm:px-8 sm:pb-12">
        <h1 id="about-title" className="max-w-lg font-display text-3xl font-bold leading-tight sm:text-4xl">{t("Sobre Bóveda Market")}</h1>
        <p className="mt-4 max-w-md text-lg leading-7">{t("Un comienzo más claro en el mundo digital.")}</p>
        <p className="mt-8 text-xs leading-5">{t("Imagen ilustrativa · No representa al propietario.")}</p>
      </div>
    </section>
    <section className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
      <h2 className="font-display text-2xl font-semibold">{t("Por qué existe Bóveda Market")}</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{t("Bóveda Market nace para acercar las bóvedas digitales a personas que quieren empezar sin sentirse perdidas entre términos complicados.")}</p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Puedes conocer las bóvedas, entender cómo trabajan y revisar lo que vas a hacer antes de decidir.")}</p>
    </section>
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
        <h2 className="font-display text-2xl font-semibold">{t("Lo que nos guía")}</h2>
        <div className="mt-6 grid gap-7 sm:grid-cols-3">{PRINCIPLES.map(({ icon: Icon, title, text }) => <div key={title}>
          <Icon className="mb-3 size-6 text-primary" aria-hidden />
          <h3 className="font-display text-base font-semibold">{t(title)}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(text)}</p>
        </div>)}</div>
      </div>
    </section>
    <section className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("Desarrollo de Bóveda Market")}</p>
      <h2 className="mt-3 break-words font-display text-2xl font-bold">@whalewatcherpro</h2>
      <p className="mt-2 font-medium">{t("Una identidad pública, un contacto directo.")}</p>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{t("Para preguntas sobre el proyecto o ideas para mejorarlo, puedes contactar a su desarrollador por Telegram.")}</p>
      <Button asChild className="mt-5 h-11"><a href="https://t.me/whalewatcherpro" target="_blank" rel="noopener noreferrer"><MessageCircle />{t("Hablar por Telegram")}<ArrowUpRight /></a></Button>
    </section>
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h2 className="font-display text-base font-semibold">{t("Antes de empezar")}</h2>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">{t("Las bóvedas no son depósitos bancarios. Su valor puede subir o bajar y existe riesgo de pérdida. Los intereses estimados no son una promesa de ganancias.")}</p>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={t("Antes de empezar")}>
          <Button asChild variant="link" className="px-0 mr-4"><Link to={lang === "en" ? "/en/faq" : "/faq"}>{t("Preguntas frecuentes")}</Link></Button>
          <Button asChild variant="link" className="px-0 mr-4"><Link to={lang === "en" ? "/en/terms" : "/terminos"}>{t("Términos y condiciones")}</Link></Button>
          <Button asChild variant="link" className="px-0"><Link to={lang === "en" ? "/en/privacy" : "/privacidad"}>{t("Política de privacidad")}</Link></Button>
        </nav>
      </div>
    </footer>
  </main>;
}