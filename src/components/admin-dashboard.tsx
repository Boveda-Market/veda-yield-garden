import { Suspense, useState } from "react";
import { ANNOUNCEMENTS } from "@/lib/announcements";
import { Link } from "@tanstack/react-router";
import { Activity, Gift, Inbox, Megaphone, ShieldCheck, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { lazyWithReload } from "@/lib/lazy-reload";

const AffiliatePayoutsAdmin = lazyWithReload(() => import("./affiliate-payouts-admin").then((m) => ({ default: m.AffiliatePayoutsAdmin })));
const AffiliateVipAdmin = lazyWithReload(() => import("./affiliate-vip-admin").then((m) => ({ default: m.AffiliateVipAdmin })));
const TelegramPublishAdmin = lazyWithReload(() => import("./telegram-publish-admin").then((m) => ({ default: m.TelegramPublishAdmin })));
const MailboxAdmin = lazyWithReload(() => import("./mailbox-admin").then((m) => ({ default: m.MailboxAdmin })));
const SuggestionsAdmin = lazyWithReload(() => import("./suggestions-admin").then((m) => ({ default: m.SuggestionsAdmin })));
const WalletPolicyAdmin = lazyWithReload(() => import("./wallet-policy-admin").then((m) => ({ default: m.WalletPolicyAdmin })));

const TABS = [
  { key: "finanzas", label: "Finanzas", icon: Wallet },
  { key: "afiliados", label: "Afiliados y VIP", icon: Gift },
  { key: "correo", label: "Correo", icon: Inbox },
  { key: "comunidad", label: "Comunidad", icon: Megaphone },
  { key: "seguridad", label: "Seguridad", icon: ShieldCheck },
] as const;

/** Operator-only control panel. Each section re-verifies the treasury owner server-side. */
export function AdminDashboard() {
  const t = useT();
  const session = useBovedaSession();
  const [tab, setTab] = useState("finanzas");
  const latest = ANNOUNCEMENTS[0];
  if (!session.ready) return <p role="status" className="py-10 text-muted-foreground">{t("Cargando…")}</p>;
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 py-10 text-center"><ShieldCheck className="mx-auto text-primary" /><h1 className="mt-3 font-display text-xl font-semibold">{t("Acceso solo para el operador")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Conecta la wallet de tesorería para abrir el panel de control.")}</p><Link to="/wallet" className="mt-4 inline-block text-sm font-semibold text-primary underline">{t("Volver al inicio")}</Link></section>;
  const w = session.walletAddress;
  const box = "[&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0 [&_section]:scroll-mt-20";
  return <div className="mx-auto max-w-5xl py-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
      <div><p className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck size={14} />{t("Operador verificado")}</p><h1 className="mt-3 font-display text-3xl font-semibold">{t("Panel de Control")}</h1><p className="mt-1 font-mono text-xs text-muted-foreground">{t("Tesorería")} · {w.slice(0, 4)}…{w.slice(-4)}</p></div>
      <Link to="/status" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"><Activity size={16} />{t("Estado del sistema")}</Link>
    </header>
    {latest && tab !== "comunidad" && <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"><p className="flex min-w-0 items-center gap-2 text-sm"><Megaphone size={18} className="shrink-0 text-primary" aria-hidden /><span><strong>{t("Anuncio listo para Telegram:")}</strong> {latest.title}</span></p><button type="button" onClick={() => setTab("comunidad")} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{t("Ir a publicar")}</button></div>}
    <Tabs value={tab} onValueChange={setTab} className="mt-5">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => <TabsTrigger key={key} value={key} className="gap-2 px-3 py-2"><Icon size={16} aria-hidden />{t(label)}{key === "comunidad" && latest && <span aria-label={t("Nuevo")} className="h-2 w-2 rounded-full bg-primary" />}</TabsTrigger>)}
      </TabsList>
      <Suspense fallback={<p role="status" className="py-8 text-muted-foreground">{t("Cargando…")}</p>}>
        <TabsContent value="finanzas" className={`mt-4 ${box}`}><AffiliatePayoutsAdmin /></TabsContent>
        <TabsContent value="afiliados" className={`mt-4 ${box}`}><AffiliateVipAdmin /></TabsContent>
        <TabsContent value="correo" className={`mt-4 ${box}`}><MailboxAdmin /></TabsContent>
        <TabsContent value="comunidad" className={`mt-4 space-y-6 ${box}`}><TelegramPublishAdmin /><SuggestionsAdmin /></TabsContent>
        <TabsContent value="seguridad" className={`mt-4 ${box}`}><WalletPolicyAdmin /></TabsContent>
      </Suspense>
    </Tabs>
  </div>;
}
