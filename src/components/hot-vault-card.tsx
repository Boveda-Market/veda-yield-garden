import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { DctySkyline, TrumpFlag, VaultTitle, vaultSkin } from "@/components/vault-skin";
import { poolYieldOptions } from "@/lib/pool-yield";
import { fetchPoolStats } from "@/lib/pool-stats";
import type { Vault } from "@/lib/vaults";

const num = (v: number | null | undefined) => v == null ? "—" : v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
const usd = (v: number | null | undefined) => v == null ? "—" : `$${v.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

/** Vice-City-style sunset sky (sun with horizon stripes, no palms; original art, no game logos). */
export function Sunset() {
  return <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="xMaxYMax meet" className="pointer-events-none absolute inset-0 h-full w-full text-hot-surface">
    <defs>
      <linearGradient id="hot-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(0.93 0.14 90)" /><stop offset="1" stopColor="var(--hot)" /></linearGradient>
      <mask id="hot-sun-cut"><rect width="400" height="100" fill="white" />{[62, 72, 80, 87, 93].map((y, i) => <rect key={y} y={y} width="400" height={2 + i * 0.8} fill="black" />)}</mask>
    </defs>
    <circle cx="300" cy="100" r="62" fill="url(#hot-sun)" mask="url(#hot-sun-cut)" />
  </svg>;
}

/** Sunset banner with the GTA-style title, shared by the vault card and the active portfolio card. */
export function HotBanner({ vault, children, className = "" }: { vault: Vault; children?: ReactNode; className?: string }) {
  return <div className={`relative flex items-center justify-between gap-3 overflow-hidden bg-[image:var(--gradient-hot)] px-2.5 py-2 text-hot-foreground sm:px-4 sm:py-3 ${vaultSkin(vault.id)} ${className}`}>
    {vault.id === "dcty" ? <DctySkyline /> : vault.id === "trump" ? <TrumpFlag /> : <Sunset />}
    <h3 className="relative min-w-0"><VaultTitle vault={vault} className="h-6 sm:h-9" /></h3>
    {children && <div className="relative flex shrink-0 flex-col items-end gap-1">{children}</div>}
  </div>;
}

/** Compact neon "Sé la casa" card for high-octane range vaults: same footprint as a normal vault, live numbers first. */
export function HotVaultCard({ vault, owned, ownedLink, hasPosition, depositDisabled, onDeposit, onDetails }: {
  vault: Vault; owned: ReactNode; ownedLink: ReactNode; hasPosition: boolean; depositDisabled: boolean; onDeposit: () => void; onDetails: () => void;
}) {
  const t = useT();
  const y = useQuery(poolYieldOptions(vault.pool));
  // Same cache key as PoolYield / pool details, so DexScreener is queried once.
  const s = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, refetchInterval: 60_000, retry: 1 });
  const apr = y.data?.apr;
  const buys = s.data?.buys24h ?? null, sells = s.data?.sells24h ?? null;
  const total = buys != null && sells != null ? buys + sells : null;
  const steps = [["💵", "Depositas"], ["⚡", "Piloto automático"], ["📈", "Ganancias automáticas"]] as const;
  return <article className={`hot-ring rounded-2xl p-[2px] shadow-[var(--shadow-hot)] ${vaultSkin(vault.id)}`}>
    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-[calc(1rem-2px)] bg-[image:var(--gradient-hot-surface)] text-hot-foreground">
      <HotBanner vault={vault} className="py-3">
        <span className="hidden rounded-full bg-hot-surface px-2.5 py-0.5 text-[10px] sm:inline font-black uppercase tracking-wide">⚡ {t("Sé la casa")}</span>
        <span className="flex items-center gap-1 rounded-full bg-hot-surface/70 px-2 py-0.5 text-[10px] font-bold uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live shadow-[0_0_6px_var(--live)] motion-reduce:animate-none" />{t("En vivo")}</span>
      </HotBanner>
      <div className="flex flex-1 flex-col p-2 sm:p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-hot-muted"><span className="rounded-full border border-hot-foreground/15 bg-hot-surface/50 px-1.5 py-px text-[10px] font-normal">{t("Alto riesgo")}</span></p>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p key={apr ?? "x"} className="animate-count-pop bg-[image:var(--gradient-hot)] bg-clip-text font-display text-4xl font-black leading-tight text-transparent tabular-nums">{apr == null ? "—" : `${apr.toLocaleString("es-MX", { maximumFractionDigits: 0 })}%`}</p>
          <p className="text-[10px] font-medium leading-tight text-hot-muted sm:text-[11px]">{y.isPending ? t("Consultando el pool…") : t("APR estimado · intereses 24 h")}</p>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-1.5">
          {[[t("Intereses hoy"), usd(y.data?.fees24h)], [t("Intercambios hoy"), num(total)], [t("Holders"), num(y.data?.holders)]].map(([k, v]) => <div key={k} className="rounded-lg bg-hot-surface/60 px-2 py-1.5">
            <dt className="truncate text-[9px] font-semibold uppercase tracking-wide text-hot-muted">{k}</dt>
            <dd className="font-display text-sm font-bold tabular-nums">{v}</dd>
          </div>)}
        </dl>
        <TokenLinks vault={vault} />
        <p className="mt-1.5 text-[10px] leading-snug text-hot-muted">{t("El valor de tu posición cambia con las compras y ventas rápidas del mercado.")}</p>
        {!hasPosition && <ol className="mt-3 hidden flex-wrap gap-1.5">{steps.map(([icon, label]) => <li key={label} className="flex items-center gap-1 rounded-full bg-hot-surface/60 px-2.5 py-1 text-[11px] font-bold">{icon} {t(label)}</li>)}</ol>}
        {ownedLink}
        {owned}
        <div className="mt-auto grid grid-cols-1 gap-1.5 pt-2 sm:grid-cols-[auto_1fr] sm:gap-2 sm:pt-3">
          <button type="button" onClick={onDetails} className="order-2 h-9 rounded-xl border sm:order-none sm:h-11 border-hot-foreground/25 bg-hot-foreground/10 px-2 text-xs font-semibold transition sm:px-3 sm:text-sm hover:bg-hot-foreground/20">{t("Detalles de la bóveda")}</button>
          <button type="button" disabled={depositDisabled} onClick={onDeposit} className="hot-cta flex h-10 items-center justify-center gap-1 rounded-xl font-display text-sm sm:h-11 sm:gap-2 sm:text-base font-black text-hot-surface shadow-[var(--shadow-hot)] transition active:scale-95 disabled:opacity-70">{hasPosition ? <><Plus size={18} strokeWidth={3} />{t("Depositar más")}</> : t("Depositar")}</button>
        </div>
      </div>
    </div>
  </article>;
}

/** Web · X · GMGN pills for the vault token; opens in a new tab. */
export function TokenLinks({ vault }: { vault: Vault }) {
  const t = useT();
  const l = vault.links;
  if (!l) return null;
  const pill = "flex h-7 items-center justify-center gap-1 rounded-full border border-hot-foreground/15 bg-hot-surface/65 px-2 text-[11px] font-bold transition hover:bg-hot-surface active:scale-95";
  return <div className="mt-2 grid grid-cols-3 gap-1.5">
    <a href={l.web} target="_blank" rel="noopener noreferrer" className={pill}>🌐 Web</a>
    <a href={l.x} target="_blank" rel="noopener noreferrer" className={pill} aria-label="X">𝕏</a>
    <a href={l.gmgn} target="_blank" rel="noopener noreferrer" className={pill}><img src="/gmgn-logo.png" alt="" width={16} height={16} className="h-4 w-4 rounded-sm" />{t("Ver gráfica")}</a>
  </div>;
}
