import { AutopilotDefault } from "@/components/autopilot-toggle";
import { IN_APP_FLAG, OPEN_MENU_EVENT, OPEN_MENU_FLAG } from "./back-button";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, PieChart, Wallet, Menu, Gift, UserRound, LogOut, LogIn, Home, History, Send, Zap, BookOpen, Headset, Library } from "lucide-react";
import { SUPPORT_URL } from "./safety-notice";
import { useEffect, useState } from "react";
import { useT, useI18n } from "@/lib/i18n";
import { blogIndexHref } from "./blog-layout";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { LanguageMenu } from "./language-menu";
import { ThemeToggle } from "./theme-toggle";
import { NewsBell } from "./news-bell";
import { useContext } from "react";
import { ShieldCheck } from "lucide-react";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { AFFILIATE_PAYOUT_WALLET } from "@/lib/affiliate";
import { Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SuggestionBox } from "./suggestion-box";
import { useHideSofia } from "@/lib/preferences";
import { Button } from "@/components/ui/button";

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
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [ideas, setIdeas] = useState(false);
  const [sofiaHidden, setSofiaHidden] = useHideSofia();
  useEffect(() => {
    try { if (sessionStorage.getItem("boveda:open-ideas")) { sessionStorage.removeItem("boveda:open-ideas"); setIdeas(true); } } catch { /* ignore */ }
  }, []);
  const row = "flex min-h-11 w-full min-w-0 items-center justify-start gap-2 whitespace-normal rounded-md px-2 py-1.5 text-left text-[13px] font-normal leading-4 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0";
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
    <Button variant="outline" onClick={() => setOpen(true)} aria-label={t("Abrir menú")} className="h-10 gap-2 rounded-full border-border bg-card px-4 font-medium hover:bg-secondary"><Menu size={18} />{t("Menú")}</Button></span>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex h-dvh w-full max-w-sm flex-col gap-0 overflow-hidden px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] sm:max-w-md sm:px-4 [&>button]:size-11">
        <div className="min-w-0 shrink-0 pb-2 pl-2 pr-12">
          <SheetTitle className="font-display">{guest ? t("Invitado · Prueba") : visitor ? t("Menú") : t("Mi cuenta")}</SheetTitle>
          {user && <SheetDescription className="truncate text-xs">{user}</SheetDescription>}
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col">
          {guest ? <>
            <Button variant="ghost" className={row} onClick={() => go("invite")}><Gift size={18} />{t("Invita y gana")}</Button>
            <Button variant="ghost" className={row} onClick={() => go("account")}><UserRound size={18} />{t("Mi cuenta")}</Button>
          </> : visitor ? null : <>
            {operator && <Link to="/admin" className={`${row} border border-primary/40 bg-primary/10 font-semibold text-primary`} onClick={() => setOpen(false)}><ShieldCheck size={18} />{t("Panel de Control")}</Link>}
            <Link to="/cuenta" className={row} onClick={() => setOpen(false)}><UserRound size={18} />{t("Mi cuenta")}</Link>
            <Link to="/seguridad" className={row} onClick={() => setOpen(false)}><ShieldCheck size={18} />{t("Seguridad")}</Link>
            <Link to="/actividad" className={row} onClick={() => setOpen(false)}><History size={18} />{t("Actividad")}</Link>
            <Link to="/invita" className={row} onClick={() => setOpen(false)}><Gift size={18} />{t("Invita y gana")}</Link>
          </>}
          <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={row}><Send size={18} />{t("Canal oficial de Telegram")}</a>
          {!guest && !visitor && <>
            <Button variant="ghost" className={row} onClick={() => { setOpen(false); setIdeas(true); }}><Lightbulb size={18} />{t("Ayúdanos a mejorar")}</Button>
          </>}
          <Link to={blogIndexHref(lang)} className={row} onClick={() => setOpen(false)}><BookOpen size={18} />Blog</Link>
          <Link to={lang === "en" ? "/en/guides" : "/guias"} className={row} onClick={() => setOpen(false)}><Library size={18} />{t("Guías")}</Link>
          {sofiaHidden && <Button variant="ghost" className={row} onClick={() => { setOpen(false); setSofiaHidden(false); }}><Headset size={18} />{t("Mostrar a Sofía")}</Button>}
        </div>
        </div>
        <div className="mt-1 shrink-0 border-t border-border pt-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <LanguageMenu className="min-h-11 w-fit max-w-full" />
            <ThemeToggle className="min-h-11 shrink-0" />
          </div>
          <div className="mt-1">
          {guest ? <Link to="/" className={row}><Home size={18} />{t("Crear cuenta o entrar")}</Link>
            : visitor ? <Button variant="ghost" className={`${row} font-semibold text-primary`} onClick={() => { setOpen(false); session?.login("google"); }}><LogIn size={18} />{t("Crear cuenta o entrar")}</Button>
            : <Button variant="ghost" className={`${row} text-destructive`} onClick={() => { setOpen(false); try { sessionStorage.removeItem(IN_APP_FLAG); } catch { /* ignore */ } onLogout(); }}><LogOut size={18} />{t("Cerrar sesión")}</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <Dialog open={ideas} onOpenChange={setIdeas}>
      <DialogContent className="max-w-md"><DialogTitle className="sr-only">{t("Ayúdanos a mejorar")}</DialogTitle><SuggestionBox className="" /></DialogContent>
    </Dialog>
  </>;
}
