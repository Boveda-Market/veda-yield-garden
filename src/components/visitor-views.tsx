import { useState } from "react";
import { ArrowLeftRight, Banknote, CreditCard, QrCode, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ExploreCards } from "@/components/explore-cards";
import { LoginSheet } from "@/components/login-nudge";
import { GoogleButton } from "@/components/google-button";
import { useBovedaSession } from "@/hooks/use-boveda-session";

/** Billetera for visitors without an account: same layout at $0, and every money button opens the 3-step sign-in instead of sending them away. */
export function VisitorWallet() {
  const t = useT();
  const session = useBovedaSession();
  const [login, setLogin] = useState(false);
  const quick = [
    { icon: CreditCard, label: t("Depositar dólares") },
    { icon: Banknote, label: t("Retirar") },
    { icon: ArrowLeftRight, label: t("Cambiar") },
    { icon: Send, label: t("Enviar") },
    { icon: QrCode, label: t("Recibir") },
  ];
  return <div className="mx-auto max-w-2xl space-y-5" data-testid="visitor-wallet">
    <h1 className="font-display text-3xl font-semibold">{t("Billetera")}</h1>
    <ExploreCards />
    <section className="rounded-3xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{t("Balance en dólares")}</p>
      <p className="mt-1 font-display text-4xl tabular-nums">$0.00</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Así se ve tu cuenta digital. Entra con Google para activarla y ver tu saldo real.")}</p>
      <div className="mt-5 grid grid-cols-5 gap-1 sm:gap-2">{quick.map((q) => <button key={q.label} type="button" onClick={() => setLogin(true)} className="flex flex-col items-center gap-1.5 text-center text-xs"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"><q.icon size={20} /></span>{q.label}</button>)}</div>
      {session.ready && <GoogleButton className="mt-5 h-12 w-full" onClick={() => session.login("google")}>{t("Continuar con Google")}</GoogleButton>}
    </section>
    <LoginSheet open={login} onOpenChange={setLogin} title={t("Entra para usar tu Billetera")} />
  </div>;
}
