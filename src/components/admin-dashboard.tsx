import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { ANNOUNCEMENTS, readPublished } from "@/lib/announcements";
import { Link } from "@tanstack/react-router";
import { Activity, Eye, LayoutDashboard, Megaphone, ShieldCheck, Users, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { lazyWithReload } from "@/lib/lazy-reload";
import { TreasurySolAlert } from "./treasury-sol-alert";
import { AdminOverviewCards, useAdminCounts } from "./admin-overview";

const AffiliatePayoutsAdmin = lazyWithReload(() => import("./affiliate-payouts-admin").then((m) => ({ default: m.AffiliatePayoutsAdmin })));
const AffiliateVipAdmin = lazyWithReload(() => import("./affiliate-vip-admin").then((m) => ({ default: m.AffiliateVipAdmin })));
const TelegramPublishAdmin = lazyWithReload(() => import("./telegram-publish-admin").then((m) => ({ default: m.TelegramPublishAdmin })));
const MailboxAdmin = lazyWithReload(() => import("./mailbox-admin").then((m) => ({ default: m.MailboxAdmin })));
const SuggestionsAdmin = lazyWithReload(() => import("./suggestions-admin").then((m) => ({ default: m.SuggestionsAdmin })));
const CardPreviewAdmin = lazyWithReload(() => import("./card-preview-admin").then((m) => ({ default: m.CardPreviewAdmin })));
const WalletPolicyAdmin = lazyWithReload(() => import("./wallet-policy-admin").then((m) => ({ default: m.WalletPolicyAdmin })));
const AdminUsers = lazyWithReload(() => import("./admin-users").then((m) => ({ default: m.AdminUsers })));

const SECTIONS = [
  { key: "resumen", label: "Resumen", hint: "Lo que necesita atención", icon: LayoutDashboard },
  { key: "usuarios", label: "Usuarios", hint: "Conectados, cuentas y embudo", icon: Users },
  { key: "negocio", label: "Finanzas y Afiliados", hint: "Tesorería, pagos y códigos VIP", icon: Wallet },
  { key: "comunicaciones", label: "Comunicaciones", hint: "Correo, Telegram y sugerencias", icon: Megaphone },
  { key: "seguridad", label: "Seguridad y Estado", hint: "Acceso de wallets y monitor", icon: ShieldCheck },
  { key: "vista", label: "Vista previa", hint: "Tarjetas y pasos tal como los ve el usuario", icon: Eye },
] as const;
type Section = (typeof SECTIONS)[number]["key"];
const STORE = "boveda:admin-section";
const isSection = (v: unknown): v is Section => SECTIONS.some((s) => s.key === v);

const Block = ({ title, children }: { title: string; children: ReactNode }) => <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</div>;

/** Operator-only control panel: «Resumen» first, task-ordered menu (left rail on desktop, sticky chips on phones), section kept in ?s= and remembered. Each section re-verifies the treasury owner server-side. */
export function AdminDashboard() {
  const t = useT();
  const session = useBovedaSession();
  const [section, setSection] = useState<Section>("resumen");
  const [published, setPublished] = useState<string[] | null>(null);
  useEffect(() => { const f = () => setPublished(readPublished()); f(); window.addEventListener("boveda-published", f); return () => window.removeEventListener("boveda-published", f); }, []);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("s");
    let saved: string | null = null; try { saved = localStorage.getItem(STORE); } catch { /* ignore */ }
    const pick = isSection(fromUrl) ? fromUrl : isSection(saved) ? saved : "resumen";
    setSection(pick);
  }, []);
  const go = (s: string) => {
    if (!isSection(s)) return;
    setSection(s);
    try { localStorage.setItem(STORE, s); } catch { /* ignore */ }
    const url = new URL(window.location.href); url.searchParams.set("s", s); window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const operator = session.ready && session.walletAddress === AFFILIATE_PAYOUT_WALLET;
  const latest = published ? ANNOUNCEMENTS.find((a) => !published.includes(a.id)) : undefined;
  if (!session.ready) return <p role="status" className="py-10 text-muted-foreground">{t("Cargando…")}</p>;
  if (!operator) return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 py-10 text-center"><ShieldCheck className="mx-auto text-primary" /><h1 className="mt-3 font-display text-xl font-semibold">{t("Acceso solo para el operador")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Conecta la wallet de tesorería para abrir el panel de control.")}</p><Link to="/wallet" className="mt-4 inline-block text-sm font-semibold text-primary underline">{t("Volver al inicio")}</Link></section>;
  return <OperatorPanel section={section} go={go} latest={latest?.title} />;
}

function OperatorPanel({ section, go, latest }: { section: Section; go: (s: string) => void; latest: string | undefined }) {
  const t = useT();
  const session = useBovedaSession();
  const counts = useAdminCounts();
  const o = counts.overview;
  const badge: Partial<Record<Section, { n?: number; dot?: boolean; alert?: boolean }>> = {
    usuarios: o && o.onlineUsers > 0 ? { n: o.onlineUsers } : {},
    negocio: { ...(o && o.payoutsDue > 0 ? { n: o.payoutsDue, alert: true } : {}), ...(counts.solLow ? { dot: true, alert: true } : {}) },
    comunicaciones: (() => { const n = (o?.unreadSuggestions ?? 0) + (counts.unreadMail ?? 0); return n > 0 ? { n } : latest ? { dot: true } : {}; })(),
    seguridad: counts.servicesDown ? { n: counts.servicesDown, alert: true } : {},
  };
  const Badge = ({ k }: { k: Section }) => { const b = badge[k]; if (!b || (!b.n && !b.dot)) return null; return b.n ? <span className={`ml-auto rounded-full px-1.5 text-[10px] font-bold tabular-nums ${b.alert ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>{b.n}</span> : <span aria-label={t("Nuevo")} className={`ml-auto h-2 w-2 rounded-full ${b.alert ? "bg-destructive" : "bg-primary"}`} />; };
  const w = session.walletAddress ?? "";
  const box = "space-y-8 [&_section]:mt-0 [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0 [&_section]:scroll-mt-20";
  const current = SECTIONS.find((s) => s.key === section)!;
  return <div className="mx-auto max-w-6xl pb-10 pt-4">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div><p className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><ShieldCheck size={14} />{t("Operador verificado")}</p><h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{t("Panel de Control")}</h1><p className="mt-1 font-mono text-xs text-muted-foreground">{t("Tesorería")} · {w.slice(0, 4)}…{w.slice(-4)}</p></div>
      <Link to="/status" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"><Activity size={16} />{t("Estado del sistema")}</Link>
    </header>
    <TreasurySolAlert />

    {/* Phones: sticky, swipeable section chips. */}
    <nav aria-label={t("Secciones del panel")} className="sticky top-0 z-30 -mx-5 mt-3 border-b border-border bg-background/95 px-5 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto">{SECTIONS.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-current={section === key ? "page" : undefined} onClick={() => go(key)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${section === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}><Icon size={14} aria-hidden />{t(label)}<Badge k={key} /></button>)}</div>
    </nav>

    <div className="mt-4 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      {/* Desktop: fixed left menu. */}
      <nav aria-label={t("Secciones del panel")} className="hidden lg:block">
        <ul className="sticky top-4 space-y-1">{SECTIONS.map(({ key, label, hint, icon: Icon }) => <li key={key}><button type="button" aria-current={section === key ? "page" : undefined} onClick={() => go(key)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${section === key ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Icon size={17} aria-hidden /><span className="min-w-0"><span className="block truncate">{t(label)}</span><span className="block truncate text-[11px] font-normal text-muted-foreground">{t(hint)}</span></span><Badge k={key} /></button></li>)}</ul>
      </nav>

      <main className="min-w-0">
        <div className="mb-4"><h2 className="flex items-center gap-2 font-display text-xl font-semibold"><current.icon size={20} className="text-primary" />{t(current.label)}</h2><p className="text-sm text-muted-foreground">{t(current.hint)}</p></div>
        {latest && section !== "comunicaciones" && <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4"><p className="flex min-w-0 items-center gap-2 text-sm"><Megaphone size={18} className="shrink-0 text-primary" aria-hidden /><span><strong>{t("Anuncio listo para Telegram:")}</strong> {latest}</span></p><button type="button" onClick={() => go("comunicaciones")} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">{t("Ir a publicar")}</button></div>}
        <Suspense fallback={<p role="status" className="py-8 text-muted-foreground">{t("Cargando…")}</p>}>
          {section === "resumen" && <AdminOverviewCards counts={counts} go={go} />}
          {section === "usuarios" && <AdminUsers visitorsOnline={o?.onlineVisitors ?? null} />}
          {section === "negocio" && <div className={box}><Block title={t("Tesorería y pagos")}><AffiliatePayoutsAdmin /></Block><Block title={t("Códigos VIP y directorio")}><AffiliateVipAdmin /></Block></div>}
          {section === "comunicaciones" && <div className={box}><Block title={t("Canal de Telegram")}><TelegramPublishAdmin /></Block><Block title={t("Buzón oficial")}><MailboxAdmin /></Block><Block title={t("Sugerencias")}><SuggestionsAdmin /></Block></div>}
          {section === "seguridad" && <div className={box}><Block title={t("Control de acceso")}><WalletPolicyAdmin /></Block><Block title={t("Monitor del sistema")}><Link to="/status" className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:bg-secondary"><span className="flex items-center gap-2 font-medium"><Activity size={18} className="text-primary" />{t("Ver estado en vivo de los servicios")}</span><span aria-hidden>→</span></Link></Block></div>}
          {section === "vista" && <CardPreviewAdmin />}
        </Suspense>
      </main>
    </div>
  </div>;
}
