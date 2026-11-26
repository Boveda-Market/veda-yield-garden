import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { guidesIndexHref } from "@/components/guide-layout";
import { EntryAccess } from "@/components/entry-access";
import { PoweredBy } from "@/components/powered-by";
import { VerifyPoolsLink } from "@/components/meteora-verify";
import { useI18n } from "@/lib/i18n";
import type { HERO_VARIANTS } from "@/lib/hero-variants";
import trumpLogo from "@/assets/trump-logo.png";
import gtaTitle from "@/assets/gta6-vault-title.png";
import gtaTitleEn from "@/assets/gta6-vault-title-en.png";
import dobleLogo from "@/assets/doble-o-nada-logo.png";

function TrustLine() {
  return <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center"><PoweredBy brand="meteora" asLink /><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><img src="/brands/privy-mark.png" alt="" className="h-4 w-4" />Secured by <span className="font-semibold text-foreground">Privy</span></span></div>;
}

/** Campaign identity stays on the first screen; explanations and authentication are separate steps. */
export function WelcomeFold({ hero }: { hero: (typeof HERO_VARIANTS)[number] }) {
  const { t, lang } = useI18n();
  const image = hero.theme === "trump" ? trumpLogo : hero.theme === "gta6" ? (lang === "en" ? gtaTitleEn : gtaTitle) : hero.theme === "doble" ? dobleLogo : hero.theme === "bitcoin" ? "/tokens/btc.svg" : "/favicon.png";
  const alt = hero.theme === "trump" ? "Trump Coin" : hero.theme === "gta6" ? "GTA6 Coin" : hero.theme === "doble" ? t("Doble o Nada") : hero.theme === "bitcoin" ? "Bitcoin" : "Bóveda Market";
  const title = hero.theme === "trump" ? "Bóveda Trump Coin" : hero.theme === "gta6" ? "Bóveda GTA6 Coin" : hero.theme === "bitcoin" ? "Bitcoin con intereses" : hero.theme === "doble" ? "Doble o Nada" : hero.theme === "compound" ? hero.title : hero.theme === "own" ? "Dale una nueva función a tus monedas" : hero.theme === "calm" ? "Deja la gestión al Piloto Automático" : "Bóvedas inteligentes";
  const sub = hero.theme === "doble" ? "Predicciones en dólares. Conoce cómo funcionan antes de participar." : hero.theme === "compound" ? "Reinvertir puede aumentar los intereses futuros con el tiempo." : hero.theme === "own" ? "Conecta tus monedas con la liquidez de pools públicos." : hero.theme === "trump" || hero.theme === "gta6" || hero.theme === "bitcoin" ? "La actividad del mercado genera intereses variables. El Piloto Automático gestiona la reinversión." : "Bóvedas inteligentes y reinversión automática, sin vigilar gráficas.";
  return <section className="welcome-palette mx-auto flex min-h-[calc(100svh-132px)] max-w-xl flex-col items-center justify-center gap-3 pb-5 pt-2 text-center sm:gap-5" aria-label={t("Descubre Bóveda Market")}>
    <img src={image} alt={alt} className={hero.theme === "gta6" || hero.theme === "doble" ? "h-12 w-auto max-w-[220px] object-contain sm:h-20" : "h-12 w-12 object-contain sm:h-20 sm:w-20"} />
    <div><h1 className="font-display text-2xl font-bold leading-tight sm:text-4xl">{t(title)}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">{t(sub)}</p></div>
    <div className="w-full max-w-sm"><Button asChild className="welcome-cta h-13 w-full text-base font-bold"><Link to={lang === "en" ? "/en/get-started" : "/empezar"}>{t("Continuar")}<ArrowRight size={18} /></Link></Button><div className="mt-3"><TrustLine /></div><Button asChild variant="link" className="mt-1 h-11 text-sm"><Link to={lang === "en" ? "/en/sign-in" : "/acceso"}>{t("¿Ya tienes cuenta? Inicia sesión")}</Link></Button><nav aria-label={t("Información legal")} className="flex flex-wrap items-center justify-center gap-1"><Button asChild variant="link" className="h-11 px-1 text-xs text-muted-foreground"><Link to={guidesIndexHref(lang)}>{t("Guías")}</Link></Button><span aria-hidden className="text-muted-foreground">·</span><Button asChild variant="link" className="h-11 px-1 text-xs text-muted-foreground"><Link to="/terminos">{t("Términos y condiciones")}</Link></Button><span aria-hidden className="text-muted-foreground">·</span><Button asChild variant="link" className="h-11 px-1 text-xs text-muted-foreground"><Link to="/privacidad">{t("Privacidad")}</Link></Button></nav><p data-welcome-disclaimer className="text-[11px] leading-4 text-muted-foreground">{t("Bóveda Market solo conecta y automatiza; no custodia tus fondos. Los intereses son variables y puedes perder capital.")}</p></div>
  </section>;
}

function IntroShell({ step, children }: { step: number; children: ReactNode }) {
  const { t, lang } = useI18n();
  return <div className="min-h-svh bg-background text-foreground"><header className="mx-auto flex max-w-xl items-center justify-between px-5 pb-4 pt-14 sm:pt-16"><Button asChild variant="ghost" size="icon" className="h-11 w-11" aria-label={t("Atrás")}><Link to={step === 3 ? (lang === "en" ? "/en/get-started" : "/empezar") : (lang === "en" ? "/en" : "/")}><ArrowLeft size={20} /></Link></Button><BrandLogo /><span className="w-11" aria-hidden /></header><main className="mx-auto flex min-h-[calc(100svh-116px)] max-w-xl flex-col px-5">{children}</main></div>;
}

export function GettingStarted() {
  const { t, lang } = useI18n();
  // The screen before sign-in: show exactly what the registration does, in order.
  const signupSteps = [
    { title: "Creas tu cuenta", body: "Con Google o con email, en un toque." },
    { title: "Se crea tu billetera digital", body: "El sistema abre una billetera nueva enlazada a tu cuenta." },
    { title: "Abres tu bóveda o exploras", body: "Sigue los pasos para abrir tu nueva bóveda, o explora la app para conocer más." },
  ];
  return <IntroShell step={2}><div className="pb-28 pt-4"><h1 className="text-center font-display text-2xl font-bold">{"\n"}</h1><ol className="mt-4 divide-y divide-border">{signupSteps.map((s, i) => <li key={s.title} className="flex gap-3 py-2.5 first:pt-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">{i + 1}</span><div className="min-w-0"><h2 className="font-display text-base font-semibold">{t(s.title)}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{t(s.body)}</p></div></li>)}</ol><div className="mt-1 flex justify-center"><VerifyPoolsLink /></div><p className="mt-2 text-center text-xs leading-5 text-muted-foreground">{t("Los intercambios del pool generan intereses variables. Reinvertir no garantiza ganancias; puedes perder capital.")}</p><details className="mt-3 border-t border-border pt-3 text-sm"><summary className="cursor-pointer font-semibold text-primary">{t("Antes de depositar")}</summary><p className="pt-2 text-sm leading-6 text-muted-foreground">{t("Tu depósito aporta liquidez a un pool público. El Piloto Automático no actúa en cada fluctuación y puedes desactivarlo. Revisas los importes y condiciones antes de autorizar. El cierre depende de la liquidez y del mercado. Los dólares digitales no son un depósito bancario asegurado.")}</p><div className="mt-2 flex gap-4"><Link to="/terminos" className="text-primary underline">{t("Términos")}</Link><Link to="/privacidad" className="text-primary underline">{t("Privacidad")}</Link></div></details></div><div className="sticky bottom-0 mt-auto border-t border-border bg-background pb-5 pt-3"><Button asChild className="h-14 w-full text-base font-bold"><Link to={lang === "en" ? "/en/sign-in" : "/acceso"}>{"Continuar "}<ArrowRight size={18} /></Link></Button></div></IntroShell>;
}

export function AccountAccess() {
  const { t } = useI18n();
  return <IntroShell step={3}><div className="mx-auto w-full max-w-sm pb-8 pt-6"><h1 className="text-center font-display text-2xl font-bold">{t("Bienvenido a Bóveda Market")}</h1><div className="mt-5 [&>div]:mt-0"><EntryAccess /></div></div></IntroShell>;
}