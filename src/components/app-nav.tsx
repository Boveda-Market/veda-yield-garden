import { AutopilotDefault } from "@/components/autopilot-toggle";
import { IN_APP_FLAG, OPEN_MENU_EVENT, OPEN_MENU_FLAG } from "./back-button";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, PieChart, TrendingUp, Wallet, Menu, Gift, UserRound, HelpCircle, FileText, Shield, LogOut, LogIn, Home, History, Send, Bell, Zap } from "lucide-react";
import { SUPPORT_URL } from "./safety-notice";
import { InstallAppButton } from "./install-app";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { LanguageMenu } from "./language-menu";
import { ThemeToggle } from "./theme-toggle";
import { NewsBell } from "./news-bell";
import { SecurityWhyDialog } from "./security-why";
import { useContext } from "react";
import { ShieldCheck } from "lucide-react";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SuggestionBox } from "./suggestion-box";
import { StatusDot, useSystemState } from "./system-status";
import { Activity } from "lucide-react";

export type AppView = "vaults" | "portfolio" | "activity" | "account" | "security" | "notifications" | "invite" | "wallet" | "markets" | "admin";

const MAIN = [
  { key: "vaults", label: "Bóvedas", icon: LayoutDashboard, to: "/app" },
  { key: "markets", label: "Doble o Nada", icon: Zap, to: "/mercados" },
  { key: "portfolio", label: "Mi Portafolio", icon: PieChart, to: "/portfolio" },
  { key: "wallet", label: "Billetera", icon: Wallet, to: "/wallet" },
] as const;

export function BottomNav({ active, guest, onSelect }: { active: AppView; guest: boolean; onSelect: (v: AppView) => void }) {
  const t = useT();
  const items = guest ? MAIN.filter((i) => i.key !== "wallet") : MAIN;
  return <nav aria-label={t("Secciones de Bóveda Market")} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
    <ul className="mx-auto flex max-w-lg">
      {items.map(({ key, label, icon: Icon, to }) => {
        const on = active === key;
        const cls = `flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${on ? "text-primary" : "text-muted-foreground"}`;
        const body = <><Icon size={20} aria-hidden />{t(label)}</>;
        return <li key={key} className="flex-1">{guest ? <button type="button" aria-current={on ? "page" : undefined} className={cls} onClick={() => onSelect(key)}>{body}</button> : <Link to={to} aria-current={on ? "page" : undefined} className={cls}>{body}</Link>}</li>;
      })}
    </ul>
  </nav>;
}

export function ProfileMenu({ user, guest, onSelect, onLogout }: { user: string | null; guest: boolean; onSelect: (v: AppView) => void; onLogout: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [ideas, setIdeas] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem("boveda:open-ideas")) { sessionStorage.removeItem("boveda:open-ideas"); setIdeas(true); } } catch { /* ignore */ }
  }, []);
  const row = "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-secondary";
  const go = (v: AppView) => { setOpen(false); onSelect(v); };
  const session = useContext(BovedaSessionContext);
  const operator = session?.walletAddress === AFFILIATE_PAYOUT_WALLET;
  const visitor = !user && !guest;
  useEffect(() => {
    if (guest || visitor) return;
    const openMenu = () => setOpen(true);
    try { sessionStorage.setItem(IN_APP_FLAG, "1"); if (sessionStorage.getItem(OPEN_MENU_FLAG) === "1") { sessionStorage.removeItem(OPEN_MENU_FLAG); setOpen(true); } } catch { /* ignore */ }
    window.addEventListener(OPEN_MENU_EVENT, openMenu);
    return () => window.removeEventListener(OPEN_MENU_EVENT, openMenu);
  }, [guest, visitor]);
  return <>
    <span className="inline-flex items-center gap-2">{!visitor && <NewsBell />}{!visitor && <AutopilotDefault />}
    <button type="button" onClick={() => setOpen(true)} aria-label={t("Abrir menú")} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-secondary"><Menu size={18} />{t("Menú")}</button></span>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[85%] max-w-sm overflow-y-auto">
        <SheetTitle className="font-display">{guest ? t("Invitado · Prueba") : visitor ? t("Menú") : t("Mi cuenta")}</SheetTitle>
        {user && <SheetDescription className="truncate">{user}</SheetDescription>}
        <div className="mt-6 space-y-1">
          {guest ? <>
            <button type="button" className={row} onClick={() => go("invite")}><Gift size={18} />{t("Invita y gana")}</button>
            <button type="button" className={row} onClick={() => go("account")}><UserRound size={18} />{t("Mi cuenta")}</button>
          </> : visitor ? null : <>
            {operator && <Link to="/admin" className={`${row} border border-primary/40 bg-primary/10 font-semibold text-primary`} onClick={() => setOpen(false)}><ShieldCheck size={18} />{t("Panel de Control")}</Link>}
            <Link to="/wallet" className={row} onClick={() => setOpen(false)}><Home size={18} />{t("Inicio")}</Link>
            <Link to="/portfolio" className={row} onClick={() => setOpen(false)}><PieChart size={18} />{t("Mi Portafolio")}</Link>
            <Link to="/notificaciones" className={row} onClick={() => setOpen(false)}><Bell size={18} />{t("Notificaciones")}</Link>
            <Link to="/cuenta" className={row} onClick={() => setOpen(false)}><UserRound size={18} />{t("Mi cuenta")}</Link>
            <Link to="/seguridad" className={row} onClick={() => setOpen(false)}><ShieldCheck size={18} />{t("Seguridad")}</Link>
            <Link to="/actividad" className={row} onClick={() => setOpen(false)}><History size={18} />{t("Actividad")}</Link>
            <Link to="/invita" className={row} onClick={() => setOpen(false)}><Gift size={18} />{t("Invita y gana")}</Link>
          </>}
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={row}><Send size={18} />{t("Canal oficial de Telegram")}</a>
          <Link to="/terminos" className={row}><FileText size={18} />{t("Términos y condiciones")}</Link>
          <Link to="/privacidad" className={row}><Shield size={18} />{t("Política de privacidad")}</Link>
          <Link to="/faq" className={row}><HelpCircle size={18} />{t("Preguntas frecuentes")}</Link>
          <Link to="/about" className={row} onClick={() => setOpen(false)}><UserRound size={18} />{t("Sobre Bóveda Market")}</Link>
          <StatusRow className={row} />
          {!guest && !visitor && <>
            <button type="button" className={`${row} text-left`} onClick={() => { setOpen(false); setIdeas(true); }}><Lightbulb size={18} />{t("Ayúdanos a mejorar")}</button>
            <SecurityWhyDialog trigger={(o) => <button type="button" className={`${row} w-full text-left`} onClick={o}><ShieldCheck size={18} />{t("¿Por qué tus fondos están seguros?")}</button>} />
          </>}
          <InstallAppButton className={row} />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm"><span>{t("Idioma")}</span><LanguageMenu /></div>
        <div className="mt-3 flex items-center justify-between text-sm"><span>{t("Apariencia")}</span><ThemeToggle /></div>
        <div className="mt-4 border-t border-border pt-4">
          {guest ? <Link to="/" className={row}><Home size={18} />{t("Crear cuenta o entrar")}</Link>
            : visitor ? <button type="button" className={`${row} font-semibold text-primary`} onClick={() => { setOpen(false); session?.login("google"); }}><LogIn size={18} />{t("Crear cuenta o entrar")}</button>
            : <button type="button" className={`${row} text-destructive`} onClick={() => { setOpen(false); try { sessionStorage.removeItem(IN_APP_FLAG); } catch { /* ignore */ } onLogout(); }}><LogOut size={18} />{t("Cerrar sesión")}</button>}
        </div>
      </SheetContent>
    </Sheet>
    <Dialog open={ideas} onOpenChange={setIdeas}>
      <DialogContent className="max-w-md"><DialogTitle className="sr-only">{t("Ayúdanos a mejorar")}</DialogTitle><SuggestionBox className="" /></DialogContent>
    </Dialog>
  </>;
}

function StatusRow({ className }: { className: string }) {
  const t = useT();
  const state = useSystemState();
  return <Link to="/status" className={className}><Activity size={18} /><span className="flex-1">{t("Estado del sistema")}</span><StatusDot state={state} /></Link>;
}
