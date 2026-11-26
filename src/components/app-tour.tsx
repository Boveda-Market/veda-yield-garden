import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Bitcoin, Bot, Compass, Fingerprint, Headset, KeyRound, X, LayoutDashboard, PieChart, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { LoginSheet } from "@/components/login-nudge";
import { InstallAppButton } from "@/components/install-app";
import { useT } from "@/lib/i18n";

type Step = { key: string; icon: typeof Wallet; tone: "btc" | "met" | "trump"; area: string; title: string; body: string; mock: () => React.ReactNode };

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tour-tag rounded-full px-2 py-0.5 text-[10px] font-semibold">{children}</span>;
}

/** Illustrative mock cards: example numbers, clearly labeled, never live data. */
function VaultMock() {
  const t = useT();
  return <div className="space-y-2"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-display font-bold"><Bitcoin size={18} className="tour-ink" />{t("Bóveda Bitcoin")}</span><Tag>{t("Piloto Automático")}</Tag></div>
    <div className="grid grid-cols-2 gap-2 text-left"><div className="tour-cell rounded-xl p-2"><p className="text-[10px] text-muted-foreground">{t("Rendimiento estimado")}</p><p className="font-display text-lg font-bold tour-ink">18,4%</p></div><div className="tour-cell rounded-xl p-2"><p className="text-[10px] text-muted-foreground">{t("Monedas del pool")}</p><p className="font-display text-lg font-bold">BTC / $</p></div></div>
    <div className="tour-cta rounded-xl py-2 text-center text-sm font-bold">{t("Depositar")}</div></div>;
}
function PredictMock() {
  const t = useT();
  return <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="font-display font-bold">BTC · 15 min</span><Tag>04:32</Tag></div>
    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="tour-up h-full w-[58%]" /></div>
    <div className="grid grid-cols-2 gap-2"><div className="tour-up rounded-xl py-3 text-center font-bold">{t("Sube")} 58%</div><div className="tour-down rounded-xl py-3 text-center font-bold">{t("Baja")} 42%</div></div></div>;
}
function PortfolioMock() {
  const t = useT();
  return <div className="space-y-2"><svg viewBox="0 0 200 48" className="h-12 w-full" aria-hidden><polyline points="0,40 30,34 60,36 90,24 120,26 150,14 200,8" fill="none" className="tour-line" strokeWidth="3" strokeLinecap="round" /></svg>
    <div className="grid grid-cols-2 gap-2 text-left"><div className="tour-cell rounded-xl p-2"><p className="text-[10px] text-muted-foreground">{t("Dinero trabajando")}</p><p className="font-display font-bold">$500,00</p></div><div className="tour-cell rounded-xl p-2"><p className="text-[10px] text-muted-foreground">{t("Ganancias cosechadas")}</p><p className="font-display font-bold tour-ink">+$12,40</p></div></div>
    <div className="tour-cta rounded-xl py-2 text-center text-sm font-bold">{t("Cosechar")}</div></div>;
}
function WalletMock() {
  const t = useT();
  return <div className="space-y-2 text-left"><p className="text-[10px] text-muted-foreground">{t("Dólares disponibles")}</p><p className="font-display text-2xl font-bold">$250,00</p>
    <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">{["Añadir fondos", "Cambiar", "Retirar"].map((l) => <div key={l} className="tour-cell rounded-xl py-2">{t(l)}</div>)}</div></div>;
}
function SafetyMock() {
  const t = useT();
  const rows: [typeof Wallet, string][] = [[Fingerprint, "Google, huella o Face ID"], [KeyRound, "Solo tú firmas cada operación"], [ShieldCheck, "Bóveda Market no custodia tus fondos"]];
  return <ul className="space-y-2 text-left">{rows.map(([I, l]) => <li key={l} className="tour-cell flex items-center gap-2 rounded-xl p-2 text-sm font-semibold"><I size={18} className="tour-ink shrink-0" />{t(l)}</li>)}</ul>;
}

const STEPS: Step[] = [
  { key: "vaults", icon: LayoutDashboard, tone: "btc", area: "Bóvedas", title: "Tus dólares trabajan en una bóveda", body: "Aportas dólares a un mercado público donde miles de personas intercambian monedas. Cada intercambio deja una comisión y recibes tu parte. El Piloto Automático la vigila 24/7 y reinvierte por ti.", mock: VaultMock },
  { key: "markets", icon: Zap, tone: "trump", area: "Doble o Nada", title: "¿Sube o baja en 15 minutos?", body: "Rondas relámpago sobre Bitcoin, Ethereum y Solana. Eliges en dólares, sin comprar la moneda, y la ronda se resuelve sola. Si aciertas, cobras tu premio en tu cuenta.", mock: PredictMock },
  { key: "portfolio", icon: PieChart, tone: "met", area: "Mi Portafolio", title: "Tu centro de control", body: "Ves cuánto depositaste, cuánto tienes hoy y cuánto has ganado. Cosechas tus intereses cuando quieras o los dejas crecer.", mock: PortfolioMock },
  { key: "wallet", icon: Wallet, tone: "btc", area: "Billetera", title: "Entras y sales solo en dólares", body: "1 dólar digital vale 1 dólar. Recargas con tarjeta, Apple Pay o Coinbase, y retiras a tu banco cuando quieras, sin plazos.", mock: WalletMock },
  { key: "safety", icon: ShieldCheck, tone: "trump", area: "Seguridad", title: "Tu dinero, bajo tu control", body: "Sin frases secretas en papel. Entras con Google o tu huella, y nadie puede mover un centavo sin tu firma. Los intereses son variables y puedes perder capital.", mock: SafetyMock },
];

export function AppTour({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [login, setLogin] = useState(false);
  const [x0, setX0] = useState<number | null>(null);
  const step = STEPS[i] ?? STEPS[0]!;
  const last = i === STEPS.length - 1;
  const Icon = step.icon;
  const Mock = step.mock;
  const go = (d: number) => setI((n) => Math.min(STEPS.length - 1, Math.max(0, n + d)));
  return <>
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setI(0); }}>
      <ActionSheetContent>
        <div className="flex gap-1 pr-10" aria-hidden>{STEPS.map((s, n) => <span key={s.key} className={`h-1.5 flex-1 rounded-full ${n <= i ? `tour-bar-${STEPS[n]!.tone}` : "bg-muted"}`} />)}</div>
        <div className={`tour-card tour-${step.tone} mt-3 rounded-3xl p-4`} onTouchStart={(e) => setX0(e.touches[0]?.clientX ?? null)} onTouchEnd={(e) => { const x = e.changedTouches[0]?.clientX; if (x0 != null && x != null && Math.abs(x - x0) > 50) go(x < x0 ? 1 : -1); setX0(null); }}>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide tour-ink"><Icon size={14} />{t(step.area)} · {i + 1}/{STEPS.length}</p>
          <div key={step.key} className="tour-mock rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-300"><Mock /></div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("Ejemplo ilustrativo, no son datos reales")}</p>
        </div>
        <DialogTitle className="mt-3 font-display text-xl">{t(step.title)}</DialogTitle>
        <DialogDescription className="text-sm leading-6">{t(step.body)}</DialogDescription>
        {last ? <div className="mt-3 grid gap-2">
          <Button size="lg" className="h-12 w-full text-base font-bold" onClick={() => setLogin(true)}><Sparkles size={18} />{t("Comenzar: crear mi cuenta")}</Button>
          <Button size="lg" variant="outline" className="w-full" onClick={() => onOpenChange(false)}><Compass size={18} />{t("Explorar la app por mi cuenta")}</Button>
          <InstallAppButton className="flex h-10 items-center justify-center gap-2 text-sm text-primary underline underline-offset-4" />
        </div> : <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <Button size="lg" variant="outline" disabled={i === 0} onClick={() => go(-1)} aria-label={t("Atrás")}><ArrowLeft size={18} /></Button>
          <Button size="lg" className="w-full font-bold" onClick={() => go(1)}>{t("Siguiente")}<ArrowRight size={18} /></Button>
        </div>}
        {!last && <button type="button" onClick={() => setLogin(true)} className="mt-1 h-10 w-full text-center text-sm text-muted-foreground underline underline-offset-4">{t("Ya me convencí: crear cuenta")}</button>}
      </ActionSheetContent>
    </Dialog>
    <LoginSheet open={login} onOpenChange={(o) => { setLogin(o); if (o) onOpenChange(false); }} />
  </>;
}

type Station = { target: string | null; mock: () => React.ReactNode; tone: "btc" | "met" | "trump"; area: string; text: string };
const STATIONS: Station[] = [
  { target: "#sofia-tour-banner + *", mock: VaultMock, tone: "btc", area: "Bóvedas", text: "Aquí tus dólares trabajan en mercados públicos y generan comisiones 24/7. El Piloto Automático vigila tu posición por ti." },
  { target: "[data-tour='markets']", mock: PredictMock, tone: "trump", area: "Doble o Nada", text: "Rondas de 15 minutos: eliges si Bitcoin, Ethereum o Solana sube o baja, siempre en dólares." },
  { target: "[data-tour='portfolio']", mock: PortfolioMock, tone: "met", area: "Mi Portafolio", text: "Tu panel: ves cuánto depositaste, cuánto has ganado y cosechas tus intereses cuando quieras." },
  { target: "[data-tour='wallet']", mock: WalletMock, tone: "btc", area: "Billetera", text: "Tus dólares disponibles. Recargas con tarjeta o banco y retiras cuando quieras, sin plazos." },
  { target: null, mock: SafetyMock, tone: "trump", area: "Seguridad", text: "Solo tú autorizas cada movimiento con tu huella o Face ID. Si tienes dudas mientras exploras, tócame aquí abajo." },
];
const ORB = 48;

/** Sofía flies between real screen areas and opens a compact preview card at each station. */
export function SofiaTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [login, setLogin] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const st = STATIONS[i] ?? STATIONS[0]!;
  const last = i === STATIONS.length - 1;
  const close = () => { setI(0); onClose(); };
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      const el = st.target ? document.querySelector(st.target) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    const el = st.target ? document.querySelector(st.target) : null;
    if (el && i === 0) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const id = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { window.clearTimeout(id); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [open, i, st.target]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  if (!open || typeof document === "undefined" || !vp.w) return null;
  const pad = 12;
  const orbX = rect ? Math.min(vp.w - ORB - 8, Math.max(8, rect.left + rect.width / 2 - ORB / 2)) : vp.w - ORB - 16;
  const lower = rect ? rect.top + rect.height / 2 > vp.h / 2 : true;
  const orbY = rect ? (lower ? rect.top - ORB - 8 : rect.bottom + 8) : vp.h - ORB - 96;
  const cardW = Math.min(360, vp.w - pad * 2);
  const cardX = Math.min(vp.w - cardW - pad, Math.max(pad, orbX + ORB / 2 - cardW / 2));
  const cardStyle: React.CSSProperties = lower ? { left: cardX, width: cardW, bottom: Math.max(pad, vp.h - orbY + 8) } : { left: cardX, width: cardW, top: orbY + ORB + 8 };
  const Mock = st.mock;
  return createPortal(<>
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("Tour con Sofía")}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px]" onClick={close} />
      {rect && <div className="sofia-spot pointer-events-none absolute rounded-2xl transition-all duration-500" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />}
      <div className="sofia-fab sofia-orb absolute grid place-items-center rounded-full text-sofia-foreground ring-2 ring-sofia-glow" style={{ left: orbX, top: orbY, width: ORB, height: ORB }} aria-hidden><Headset size={22} /></div>
      <div key={i} className="absolute max-h-[70dvh] overflow-y-auto rounded-3xl border border-sofia-text/30 bg-card p-3 shadow-xl animate-in fade-in zoom-in-95 duration-300" style={cardStyle}>
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-sofia)] p-[2px]"><span className="grid size-full place-items-center rounded-full bg-sofia-disc text-sm font-semibold text-sofia">S</span></span>
          <p className="min-w-0 flex-1 text-xs"><span className="font-semibold text-sofia-text">Sofía</span> <span className="text-muted-foreground">· {t(st.area)} · {i + 1}/{STATIONS.length}</span></p>
          <button type="button" onClick={close} aria-label={t("Saltar tour")} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X size={16} /></button>
        </div>
        <div className={`tour-card tour-${st.tone} mt-2 rounded-2xl p-2.5`}><div className="tour-mock rounded-xl p-2.5 text-sm"><Mock /></div><p className="mt-1.5 text-center text-[10px] text-muted-foreground">{t("Ejemplo ilustrativo, no son datos reales")}</p></div>
        <p className="mt-2 text-sm leading-5">{t(st.text)}</p>
        {last ? <div className="mt-3 grid grid-cols-2 gap-2"><Button className="font-bold" onClick={() => setLogin(true)}><Sparkles size={16} />{t("Crear cuenta")}</Button><Button variant="outline" onClick={close}><Compass size={16} />{t("Explorar")}</Button></div>
          : <div className="mt-3 grid grid-cols-[auto_1fr] gap-2"><Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)} aria-label={t("Atrás")}><ArrowLeft size={16} /></Button><Button className="font-bold" onClick={() => setI(i + 1)}>{t("Siguiente")}<ArrowRight size={16} /></Button></div>}
      </div>
    </div>
    <LoginSheet open={login} onOpenChange={(o) => { setLogin(o); if (o) close(); }} />
  </>, document.body);
}

/** Visitor-only welcome card on Bóvedas: Sofía offers the guided tour. */
export function VisitorTourBanner() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState(false);
  return <section id="sofia-tour-banner" className="mb-5 rounded-3xl border border-sofia-text/30 bg-sofia-surface p-4" aria-label={t("Sofía, tu asistente")}>
    <div className="flex items-start gap-3">
      <span className="sofia-fab grid size-11 shrink-0 place-items-center rounded-full text-sofia-foreground ring-1 ring-sofia-glow/50" aria-hidden><Headset size={20} /></span>
      <div className="min-w-0"><p className="font-display font-bold">{t("¡Hola! Soy Sofía")}</p><p className="mt-0.5 text-sm text-muted-foreground">{t("¿Te muestro en 1 minuto cómo funciona Bóveda Market? Puedes explorar sin cuenta.")}</p></div>
    </div>
    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><Button className="sofia-fab font-bold text-sofia-foreground" onClick={() => setOpen(true)}><Compass size={16} />{t("Hacer el tour con Sofía")}</Button><Button variant="outline" onClick={() => setLogin(true)}>{t("Crear cuenta")}</Button></div>
    <SofiaTour open={open} onClose={() => setOpen(false)} />
    <LoginSheet open={login} onOpenChange={setLogin} />
  </section>;
}
