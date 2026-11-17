import { useEffect, useRef, useState } from "react";
import { Flame, Volume2, VolumeX } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import type { ChainPosition } from "@/lib/solana-data";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { Button } from "./ui/button";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";
import { DepositSimulation } from "./deposit-simulation";
import { gta6Candidate } from "./gta6-promo";
import video from "@/assets/videos/gta6-en-accion.mp4.asset.json";

const gta6 = VAULTS.find((v) => v.id === "gta6");
const SEEN = "boveda:gta6-video-seen";

/** Video popup: wallets without a GTA6 position; holders of a movable vault get the migrate popup instead. */
export function showGta6Video(positions: ChainPosition[]): boolean {
  return !!gta6 && !positions.some((p) => p.vaultId === gta6.id) && !gta6Candidate(positions);
}

export function Gta6VideoCard({ onEnter, onLater }: { onEnter: () => void; onLater: () => void }) {
  const t = useT();
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return <>
    <span className="hot-cta inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden />{t("Nueva")} · {t("Alto rendimiento")}</span>
    <DialogTitle className="mt-2 font-display text-xl font-black leading-tight">{t("Bóveda GTA6 en acción")}</DialogTitle>
    <DialogDescription className="sr-only">{t("Video de cómo depositar en la bóveda GTA6")}</DialogDescription>
    <div className="hot-ring relative mt-3 overflow-hidden rounded-2xl p-[2px]">
      <video ref={ref} src={video.url} autoPlay muted={muted} loop playsInline preload="auto" className="block max-h-[52dvh] w-full rounded-[calc(1rem-2px)] bg-hot-surface object-contain" />
      <button type="button" aria-label={muted ? t("Activar sonido") : t("Silenciar")} onClick={() => { setMuted((m) => !m); void ref.current?.play().catch(() => undefined); }} className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full border border-border bg-muted text-foreground shadow-sm">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
    </div>
    <Button size="lg" className="hot-cta mt-4 w-full font-bold text-hot-surface" onClick={onEnter}>🎰 {t("Entrar a la Bóveda GTA6")} →</Button>
    <button type="button" onClick={onLater} className="mt-2 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline">{t("Ver más tarde")}</button>
  </>;
}

/** Once-per-session video popup in Mi Billetera for wallets with no GTA6 deposit. */
export function Gta6VideoPopup({ wallet }: { wallet: string | null | undefined }) {
  const q = useRealWallet(wallet ?? null);
  const ready = !!wallet && !!q.data?.success;
  const eligible = ready && showGta6Video(q.data?.success ? q.data.data.positions : []);
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState(false);
  useEffect(() => { if (!eligible) return; try { if (sessionStorage.getItem(SEEN)) return; sessionStorage.setItem(SEEN, "1"); } catch { /* show anyway */ } setOpen(true); }, [eligible]);
  if (!gta6) return null;
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent><Gta6VideoCard onEnter={() => { setOpen(false); setDeposit(true); }} onLater={() => setOpen(false)} /></ActionSheetContent>
    </Dialog>
    {deposit && <DepositSimulation vault={gta6} wallet={wallet ?? null} onClose={() => setDeposit(false)} />}
  </>;
}
