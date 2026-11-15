import { useState, type ReactNode } from "react";
import { Eye, LoaderCircle, PenLine } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RealOverview } from "@/components/real-overview";
import { MoveSteps } from "@/components/move-steps";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";

/** Operator's test wallet: only its public positions are read; nothing here can sign or move money. */
const TEST_WALLET = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu";
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const Frame = ({ title, children }: { title: string; children: ReactNode }) => <figure className="grid content-start gap-2">
  <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</figcaption>
  <div inert className="grid gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm">{children}</div>
</figure>;

/** Read-only preview of the real vault cards (any wallet's public positions) plus sample migration screens. */
export function CardPreviewAdmin() {
  const t = useT();
  const [draft, setDraft] = useState(TEST_WALLET);
  const [wallet, setWallet] = useState(TEST_WALLET);
  const [view, setView] = useState<"vaults" | "portfolio">("vaults");
  const noop = () => undefined;
  return <section className="grid gap-6">
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><Eye size={16} className="text-primary" />{t("Vista previa de solo lectura")}</p>
      <p className="mt-1 text-muted-foreground">{t("Muestra las tarjetas tal como las ve el dueño de esa billetera. Los botones están desactivados: aquí no se firma ni se mueve dinero.")}</p>
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (SOLANA_ADDRESS.test(draft.trim())) setWallet(draft.trim()); }}>
        <Input aria-label={t("Billetera a mostrar")} value={draft} maxLength={44} onChange={(e) => setDraft(e.target.value)} className="min-w-0 flex-1 font-mono text-xs" />
        <Button type="submit" size="sm" disabled={!SOLANA_ADDRESS.test(draft.trim())}>{t("Mostrar")}</Button>
        {wallet !== TEST_WALLET && <Button type="button" size="sm" variant="outline" onClick={() => { setDraft(TEST_WALLET); setWallet(TEST_WALLET); }}>{t("Billetera de pruebas")}</Button>}
      </form>
    </div>
    <div role="radiogroup" aria-label={t("Pantalla")} className="flex gap-2">{([["vaults", t("Bóvedas")], ["portfolio", t("Portafolio")]] as const).map(([k, label]) => <Button key={k} role="radio" aria-checked={view === k} size="sm" variant={view === k ? "default" : "outline"} onClick={() => setView(k)}>{label}</Button>)}</div>
    <div inert className="rounded-2xl border border-dashed border-border p-4">
      <RealOverview key={`${wallet}-${view}`} walletAddress={wallet} onDetails={noop} portfolioOnly={view === "portfolio"} />
    </div>
    <div>
      <h3 className="font-display text-lg font-semibold">{t("Pasos de la migración (ejemplo)")}</h3>
      <p className="text-sm text-muted-foreground">{t("Cantidades de ejemplo para revisar el diseño de cada paso.")}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Frame title={t("1 · Cotización")}>
          <p className="font-display text-lg font-semibold">{t("Migrar a {v}", { v: t("Bóveda MET") })}</p>
          <p className="text-sm text-muted-foreground">{t("Movemos todo tu dinero y ganancias. 0% de comisión.")}</p>
          <div className="grid gap-2">{[["Bóveda MET", "48.2"], ["Bóveda GTA6", "112.5"]].map(([n, apr], i) => <div key={n} className={`flex items-center justify-between rounded-lg border p-3 text-sm ${i === 0 ? "border-primary bg-primary/10" : "border-border"}`}><span className="font-semibold">{t(n!)}</span><span className="tabular-nums text-primary">{apr}% APR</span></div>)}</div>
          <ReceiveCard label={t("Moverás aproximadamente")} amount="12.48" unit="$" sub={`${t("Mínimo garantizado:")} $12.23`} />
          <dl className="grid gap-2 rounded-xl border border-border p-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">{t("Valor de tu posición")}</dt><dd>$12.48</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t("Comisión BÓVEDA")}</dt><dd>{t("Gratis")}</dd></div></dl>
          <Button size="lg"><PenLine className="mr-2 h-4 w-4" />{t("Confirmar migración")}</Button>
          <p className="text-center text-xs text-muted-foreground">{t("Tu billetera te pedirá 2 aprobaciones seguidas.")}</p>
        </Frame>
        <Frame title={t("2 · Cerrando bóveda (firma 1)")}>
          <MoveSteps current={1} from="SOL" to={t("Bóveda MET")} />
          <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{t("Esperando confirmación en la red…")}</p>
        </Frame>
        <Frame title={t("3 · Depositando (firma 2)")}>
          <MoveSteps current={2} to={t("Bóveda MET")} />
          <p className="text-center font-display text-3xl font-bold tabular-nums">$12.23</p>
          <Button size="lg"><LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />{t("Esperando tu firma en la wallet…")}</Button>
        </Frame>
        <Frame title={t("4 · Comprobante")}>
          <ActionSuccess title={t("¡Migración completada!")} body={t("Todo tu dinero ya está generando en la nueva bóveda. Comisión: $0.00.")} amount={{ value: "12.23", unit: "$" }} details={[{ label: t("Operación"), value: t("Migración de bóveda") }, { label: t("Destino"), value: t("Bóveda {v}", { v: "MET" }) }]} signature={null} destination={null} onClose={noop} />
        </Frame>
      </div>
    </div>
  </section>;
}
