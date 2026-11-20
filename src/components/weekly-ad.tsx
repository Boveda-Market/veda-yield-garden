import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";
import { Sunset } from "./hot-vault-card";
import { TrumpFlag, DctySkyline, vaultSkin } from "./vault-skin";
import { WEEKLY_AD_KEY, nextWeeklyAd, weeklyAdDue } from "@/lib/weekly-ad";

const HOT = VAULTS.filter((v) => v.badge);

/** Bold "Sé la casa" ad card; pure view so /admin can preview it. */
export function WeeklyAdView({ onGo, onClose }: { onGo: () => void; onClose: () => void }) {
  const t = useT();
  return <div className="grid gap-4">
    <div className="relative overflow-hidden rounded-2xl border-2 border-hot/60 bg-[image:var(--gradient-hot-surface)] p-5 text-hot-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-40"><Sunset /></div>
      <div className="relative">
        <p className="inline-flex items-center gap-1 rounded-full hot-cta px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-hot-surface"><Zap className="h-3 w-3" />{t("Sé la casa")}</p>
        <DialogTitle className="mt-3 font-display text-3xl font-black italic leading-[1.05]">{t("Deja de adivinar qué sube.")}<br />{t("Cobra de cada compra y venta.")}</DialogTitle>
        <DialogDescription className="mt-3 text-sm font-semibold text-hot-muted">{t("Mientras todos especulan, tú estás del lado de la casa: tus dólares recogen intereses en piloto automático.")}</DialogDescription>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {HOT.slice(0, 3).map((v) => <div key={v.id} className={`${vaultSkin(v.id)} relative h-16 overflow-hidden rounded-xl border border-hot/60 bg-[image:var(--gradient-hot-surface)]`}>
        <div className="absolute inset-0 opacity-60">{v.id === "trump" ? <TrumpFlag /> : v.id === "dcty" ? <DctySkyline /> : <Sunset />}</div>
        <span className="absolute inset-x-0 bottom-1 text-center text-xs font-black text-hot-foreground drop-shadow">{v.name.replace(/^Bóveda\s+/i, "").replace(/\s+Vault$/i, "")}</span>
      </div>)}
    </div>
    <p className="text-center text-[11px] text-muted-foreground">{t("Bóvedas de alto riesgo: el valor de tu depósito sube y baja con el mercado.")}</p>
    <button type="button" onClick={onGo} className="hot-cta flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-hot-surface active:scale-95">{t("Ver bóvedas de alto octanaje")}<ArrowRight className="h-4 w-4" /></button>
    <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground">{t("Ahora no")}</button>
  </div>;
}

/** Shows the ad to everyone once per random 4–7 day window (device-local), never on /admin. */
export function WeeklyAd() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let next: number | null = null;
    try { const raw = localStorage.getItem(WEEKLY_AD_KEY); next = raw ? Number(raw) : null; } catch { return; }
    if (!weeklyAdDue(next, Date.now())) return;
    const id = window.setTimeout(() => {
      try { localStorage.setItem(WEEKLY_AD_KEY, String(nextWeeklyAd(Date.now()))); } catch { /* storage blocked */ }
      setOpen(true);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <ActionSheetContent>
      <WeeklyAdView onClose={() => setOpen(false)} onGo={() => { setOpen(false); void navigate({ to: "/app" }); }} />
    </ActionSheetContent>
  </Dialog>;
}
