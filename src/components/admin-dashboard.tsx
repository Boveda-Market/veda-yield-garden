import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { ANNOUNCEMENTS, readPublished } from "@/lib/announcements";
import { Link } from "@tanstack/react-router";
import { Activity, Megaphone, ShieldCheck, Wallet } from "lucide-react";
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
  { key: "negocio", label: "Finanzas y Afiliados", hint: "Tesorería, pagos y códigos VIP", icon: Wallet },
  { key: "comunicaciones", label: "Comunicaciones", hint: "Correo, Telegram y sugerencias", icon: Megaphone },
  { key: "seguridad", label: "Seguridad y Estado", hint: "Acceso de wallets y monitor", icon: ShieldCheck },
] as const;

const Block = ({ title, children }: { title: string; children: ReactNode }) => <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</div>;

/** Operator-only control panel. Each section re-verifies the treasury owner server-side. */
export function AdminDashboard() {
  const t = useT();
  const session = useBovedaSession();
  const [tab, setTab] = useState("negocio");
  const [published, setPublished] = useState<string[] | null>(null);
  useEffect(() => { const f = () => setPublished(readPublished()); f(); window.addEventListener("boveda-published", f); return () => window.removeEventListener("boveda-published", f); }, []);
  const latest = published ? ANNOUNCEMENTS.find((a) => !published.includes(a.id)) : undefined;
  if (!session.ready) return <p role="status" className="py-10 text-muted-foreground">{t("Cargando…")}</p>;
  if (session.walletAddress !== AFFILIATE_PAYOUT_WALLET) return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 py-10 text-center"><ShieldCheck className="mx-auto text-primary" /><h1 className="mt-3 font-display text-xl font-semibold">{t("Acceso solo para el operador")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Conecta la wallet de tesorería para abrir el panel de control.")}</p><Link to="/wallet" className="mt-4 inline-block text-sm font-semibold text-primary underline">{t("Volver al inicio")}</Link></section>;
  const w = session.walletAddress;
  const box = "[&_section]:mt-0 [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0 [&_section]:scroll-mt-20";
  return <div className="mx-auto max-w-5xl py-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
      <div><p className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck size={14} />{t("Operador verificado")}</p><h1 className="mt-3 font-display text-3xl font-semibold">{t("Panel de Control")}</h1><p className="mt-1 font-mono text-xs text-muted-foreground">{t("Tesorería")} · {w.slice(0, 4)}…{w.slice(-4)}</p></div>
      <Link to="/status" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"><Activity size={16} />{t("Estado del sistema")}</Link>
    </header>
    {latest && tab !== "comunicaciones" && <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"><p className="flex min-w-0 items-center gap-2 text-sm"><Megaphone size={18} className="shrink-0 text-primary" aria-hidden /><span><strong>{t("Anuncio listo para Telegram:")}</strong> {latest.title}</span></p><button type="button" onClick={() => setTab("comunicaciones")} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{t("Ir a publicar")}</button></div>}
    <Tabs value={tab} onValueChange={setTab} className="mt-5">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl p-1">
        {TABS.map(({ key, label, hint, icon: Icon }) => <TabsTrigger key={key} value={key} title={t(hint)} className="flex-1 gap-2 px-3 py-2"><Icon size={16} aria-hidden />{t(label)}{key === "comunicaciones" && latest && <span aria-label={t("Nuevo")} className="h-2 w-2 rounded-full bg-primary" />}</TabsTrigger>)}
      </TabsList>
      <Suspense fallback={<p role="status" className="py-8 text-muted-foreground">{t("Cargando…")}</p>}>
        <TabsContent value="negocio" className={`mt-4 space-y-8 ${box}`}><Block title={t("Tesorería y pagos")}><AffiliatePayoutsAdmin /></Block><Block title={t("Códigos VIP y directorio")}><AffiliateVipAdmin /></Block></TabsContent>
        <TabsContent value="comunicaciones" className={`mt-4 space-y-8 ${box}`}><Block title={t("Canal de Telegram")}><TelegramPublishAdmin /></Block><Block title={t("Buzón oficial")}><MailboxAdmin /></Block><Block title={t("Sugerencias")}><SuggestionsAdmin /></Block></TabsContent>
        <TabsContent value="seguridad" className={`mt-4 space-y-8 ${box}`}><Block title={t("Control de acceso")}><WalletPolicyAdmin /></Block><Block title={t("Monitor del sistema")}><Link to="/status" className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:bg-secondary"><span className="flex items-center gap-2 font-medium"><Activity size={18} className="text-primary" />{t("Ver estado en vivo de los servicios")}</span><span aria-hidden>→</span></Link></Block></TabsContent>
      </Suspense>
    </Tabs>
  </div>;
}
