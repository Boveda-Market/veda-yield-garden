import { useState, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { notify, type NotifyTone } from "@/lib/notify";
import { NewsList } from "@/components/news-bell";
import { GasRefillCard } from "@/components/gas-refill-card";
import { SolExcessCard } from "@/components/sol-excess-card";
import { LoginAlert } from "@/components/login-alert";
import { SafetyNotice } from "@/components/safety-notice";
import { VaultSteps } from "@/components/vault-steps";
import { StartGuide } from "@/components/start-guide";
import { DevNote } from "@/components/dev-note";
import { PredictPositionCard } from "@/components/predict-position-card";
import { ActionSuccess } from "@/components/action-success";
import type { PredictPosition } from "@/lib/predict";
import type { ChainPosition } from "@/lib/solana-data";

const NOW = Date.now();
const SAMPLE_ROUND: PredictPosition = { pubkey: "Sample1111111111111111111111111111111111111", marketId: "sample", title: "Bitcoin Up or Down - 5 minutes", side: "up", outcome: "Up", contractsMicro: "10000000", costMicro: "5000000", valueMicro: "6200000", payoutMicro: "10000000", pnlMicro: "1200000", closeTime: Math.floor(NOW / 1000) + 180, status: "open", result: null, isYes: true };
const SAMPLE_VAULT: ChainPosition = { address: "Sample2222222222222222222222222222222222222", vaultId: "gta6", symbol: "GTA6", tokenAmount: "1200", usdcAmount: "6.10", feeTokenAmount: "3", feeUsdcAmount: "0.42", locked: false, outOfRange: true };
const TONES: [NotifyTone, string, string][] = [["success", "Depósito confirmado", "Tus dólares ya están rindiendo"], ["secure", "Firma aprobada", "Confirmando en la red…"], ["round", "Ronda activa", "Tu jugada ya está en juego"], ["info", "Información", "Ejemplo de aviso informativo"], ["error", "No se pudo completar", "No se movió dinero"]];

/** Every notice and card with sample data, so the operator can inspect them. Rendered inert: nothing here signs or moves money. */
export function NoticeGalleryAdmin() {
  const t = useT();
  const items: { id: string; title: string; node: ReactNode }[] = [
    { id: "bell", title: t("Campanita: premios, pérdidas, reembolsos y rango"), node: <NewsList predict={[{ id: "w", outcome: "won", p: { ...SAMPLE_ROUND, status: "closed", result: "yes", closeTime: Math.floor(NOW / 1000) - 60 } }, { id: "l", outcome: "lost", p: { ...SAMPLE_ROUND, pubkey: "Sample3333333333333333333333333333333333333", status: "closed", result: "no", closeTime: Math.floor(NOW / 1000) - 600 } }]} refunds={[{ id: "r", r: { order: "Sample4444444444444444444444444444444444444", marketId: "sample", title: SAMPLE_ROUND.title, amountMicro: "5000000", at: NOW - 120_000 } }]} ranges={[{ id: "g", p: SAMPLE_VAULT, since: NOW - 15 * 60_000 }]} /> },
    { id: "round", title: t("Tarjeta de jugada Sube/Baja"), node: <PredictPositionCard p={SAMPLE_ROUND} onSell={() => undefined} /> },
    { id: "won", title: t("Tarjeta de jugada ganada"), node: <PredictPositionCard p={{ ...SAMPLE_ROUND, status: "closed", result: "yes", closeTime: Math.floor(NOW / 1000) - 60 }} onClaim={() => undefined} /> },
    { id: "gas", title: t("Recargar reserva de operaciones"), node: <GasRefillCard sol={1_000_000n} usdc={20_000_000n} force /> },
    { id: "excess", title: t("Exceso de reserva como sobrante"), node: <SolExcessCard sol={200_000_000n} usdc={5_000_000n} solPrice={140} onConvert={() => undefined} /> },
    { id: "login", title: t("Mensaje de acceso cerrable"), node: <LoginAlert message={t("No se pudo iniciar sesión. Inténtalo de nuevo.")} onDismiss={() => undefined} /> },
    { id: "safety", title: t("Aviso anti-suplantación"), node: <SafetyNotice /> },
    { id: "steps", title: t("Pasos de bóvedas"), node: <VaultSteps /> },
    { id: "guide", title: t("Guía de inicio"), node: <StartGuide /> },
    { id: "dev", title: t("Nota del desarrollador"), node: <DevNote /> },
    { id: "deposit", title: t("Comprobante de depósito"), node: <ActionSuccess title={t("¡Depósito exitoso!")} body={t("Tu posición ya está generando comisiones. Puedes cosecharlas cuando quieras desde tu Portafolio.")} amount={{ value: "10.00", unit: "$" }} details={[{ label: t("Operación"), value: t("Depósito en bóveda") }]} signature={null} destination={null} onClose={() => undefined} /> },
    { id: "withdraw", title: t("Comprobante de retiro"), node: <ActionSuccess title={t("¡Retiro completado!")} body={t("Tus USDC ya están en tu wallet. También recuperaste el SOL de apertura de la posición.")} amount={{ value: "9.85", unit: "$", label: "≈" }} details={[{ label: t("Operación"), value: t("Retiro total de bóveda") }]} signature={null} destination={null} onClose={() => undefined} /> },
  ];
  const [shown, setShown] = useState<string[]>(items.map((i) => i.id));
  const toggle = (id: string) => setShown((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return <section className="grid gap-4">
    <div>
      <h3 className="font-display text-lg font-semibold">{t("Avisos y tarjetas (ejemplo)")}</h3>
      <p className="text-sm text-muted-foreground">{t("Activa o apaga cada aviso para inspeccionarlo. Usan cantidades de ejemplo y sus botones están desactivados.")}</p>
    </div>
    <div className="rounded-2xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} className="text-primary" />{t("Avisos emergentes (se muestran de verdad)")}</p>
      <div className="mt-3 flex flex-wrap gap-2">{TONES.map(([tone, title, body]) => <Button key={tone} size="sm" variant="outline" onClick={() => notify(tone, t(title), t(body))}>{t(title)}</Button>)}</div>
    </div>
    <div className="flex flex-wrap gap-2">{items.map((i) => <Button key={i.id} size="sm" role="switch" aria-checked={shown.includes(i.id)} variant={shown.includes(i.id) ? "default" : "outline"} onClick={() => toggle(i.id)}>{i.title}</Button>)}</div>
    <div className="grid gap-4 md:grid-cols-2">{items.filter((i) => shown.includes(i.id)).map((i) => <figure key={i.id} className="grid content-start gap-2">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{i.title}</figcaption>
      <div inert className="rounded-2xl border border-border bg-background p-4 shadow-sm">{i.node}</div>
    </figure>)}</div>
  </section>;
}
