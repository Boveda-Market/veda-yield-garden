import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";
import { BitcoinBlocks, TrumpFlag, VaultTitle, vaultSkin } from "./vault-skin";
import { WEEKLY_AD_KEY, nextWeeklyAd, WEEKLY_AD_LAST, pickWeeklyAd, trumpTouched, weeklyAdDue } from "@/lib/weekly-ad";


const TRUMP = VAULTS.find((v) => v.id === "trump");
const BTC = VAULTS.find((v) => v.id === "btc");
export type WeeklyAdKind = "trump" | "btc";

/** Bold weekly vault ad (TRUMP presidential or Bitcoin orange); pure view so /admin can preview it. */
export function WeeklyAdView({ onGo, onClose, kind = "trump" }: { onGo: () => void; onClose: () => void; kind?: WeeklyAdKind }) {
  const t = useT();
  const btc = kind === "btc", vault = btc ? BTC : TRUMP;
  return <div className="grid gap-4">
    <div className={`${vaultSkin(kind)} relative overflow-hidden rounded-2xl border-2 border-hot-2/70 bg-[image:var(--gradient-hot-surface)] p-5 text-hot-foreground`}>
      {btc ? <BitcoinBlocks /> : <TrumpFlag />}
      <div className="relative">
        {vault && <div className="mt-3"><VaultTitle vault={vault} className="h-10" /></div>}
        {btc
          ? <DialogTitle className="mt-4 font-display text-3xl font-black italic leading-[1.05]">{t("El oro digital ahora")} <span className="text-hot">{t("trabaja para ti.")}</span></DialogTitle>
          : <DialogTitle className="mt-4 font-display text-3xl font-black italic leading-[1.05]">{t("La moneda del presidente ya está")} <span className="trump-gold">{t("recaudando comisiones.")}</span></DialogTitle>}
        <DialogDescription className="mt-3 text-sm font-semibold text-hot-muted">{btc ? t("Bitcoin es la moneda más negociada del mundo: cada intercambio deja intereses directo a tu billetera, suba o baje el precio.") : t("Uno de los mayores volúmenes del mercado ahora paga directo a tu billetera. Abre tu posición en segundos.")}</DialogDescription>
      </div>
    </div>
    <p className="text-center text-[11px] text-muted-foreground">{t("Bóvedas de alto riesgo: el valor de tu depósito sube y baja con el mercado.")}</p>
    <button type="button" onClick={onGo} className={`${vaultSkin(kind)} hot-cta flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-hot-surface active:scale-95`}>👉 {t("Oprime aquí para entrar a la bóveda")}<ArrowRight className="h-4 w-4 shrink-0" /></button>
    <button type="button" onClick={onClose} className="text-sm font-semibold text-muted-foreground">{t("Ahora no")}</button>
  </div>;
}

/** Shows the ad to everyone once per random 4–7 day window (device-local), never on /admin. */
export function WeeklyAd() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WeeklyAdKind>("trump");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let next: number | null = null;
    try { const raw = localStorage.getItem(WEEKLY_AD_KEY); next = raw ? Number(raw) : null; } catch { return; }
    if (!weeklyAdDue(next, Date.now())) return;
    const id = window.setTimeout(() => {
      let last: string | null = null;
      try { last = localStorage.getItem(WEEKLY_AD_LAST); } catch { /* storage blocked */ }
      const pick = pickWeeklyAd(last, trumpTouched());
      try { localStorage.setItem(WEEKLY_AD_KEY, String(nextWeeklyAd(Date.now()))); localStorage.setItem(WEEKLY_AD_LAST, pick); } catch { /* storage blocked */ }
      setKind(pick);
      setOpen(true);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <ActionSheetContent>
      <WeeklyAdView kind={kind} onClose={() => setOpen(false)} onGo={() => { setOpen(false); void navigate({ to: "/app", hash: `open-${kind}` }); }} />
    </ActionSheetContent>
  </Dialog>;
}
