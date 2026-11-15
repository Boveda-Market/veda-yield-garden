import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
// Title lettering is pre-rendered artwork (classic GTA-style display face), never shipped as a webfont.
import titleEs from "@/assets/gta6-vault-title.png";
import titleEn from "@/assets/gta6-vault-title-en.png";
import { poolYieldOptions } from "@/lib/pool-yield";
import { fetchPoolStats } from "@/lib/pool-stats";
import type { Vault } from "@/lib/vaults";

const num = (v: number | null | undefined) => v == null ? "—" : v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
const usd = (v: number | null | undefined) => v == null ? "—" : `$${v.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

/** Vice-City-style sunset sky with palm silhouettes (original art, no game logos). */
function Sunset() {
  const palm = (x: number, h: number, flip = false) => <g transform={`translate(${x} ${100 - h})${flip ? " scale(-1 1)" : ""}`}>
    <path d={`M0 ${h} C 4 ${h * 0.6}, 8 ${h * 0.3}, 3 0`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    {[[-30, 8], [-22, -4], [-6, -12], [12, -10], [28, 2], [22, 14], [-14, 16]].map(([dx, dy], i) => <path key={i} d={`M3 0 Q ${dx! * 0.5} ${dy! - 12}, ${dx} ${dy! + 10}`} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />)}
  </g>;
  return <svg aria-hidden="true" viewBox="0 0 400 100" preserveAspectRatio="xMaxYMax meet" className="pointer-events-none absolute inset-0 h-full w-full text-hot-surface">
    <defs>
      <linearGradient id="hot-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="oklch(0.93 0.14 90)" /><stop offset="1" stopColor="var(--hot)" /></linearGradient>
      <mask id="hot-sun-cut"><rect width="400" height="100" fill="white" />{[62, 72, 80, 87, 93].map((y, i) => <rect key={y} y={y} width="400" height={2 + i * 0.8} fill="black" />)}</mask>
    </defs>
    <circle cx="300" cy="100" r="62" fill="url(#hot-sun)" mask="url(#hot-sun-cut)" />
    {palm(232, 72, true)}{palm(352, 82)}{palm(384, 58)}
  </svg>;
}

/** Neon "Sé la casa" card for high-octane range vaults: live numbers first, very little reading. */
export function HotVaultCard({ vault, owned, ownedLink, hasPosition, depositDisabled, onDeposit, onDetails }: {
  vault: Vault; owned: ReactNode; ownedLink: ReactNode; hasPosition: boolean; depositDisabled: boolean; onDeposit: () => void; onDetails: () => void;
}) {
  const t = useT();
  const { lang } = useI18n();
  const y = useQuery(poolYieldOptions(vault.pool));
  // Same cache key as PoolYield / pool details, so DexScreener is queried once.
  const s = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, refetchInterval: 60_000, retry: 1 });
  const apr = y.data?.apr;
  const buys = s.data?.buys24h ?? null, sells = s.data?.sells24h ?? null;
  const total = buys != null && sells != null ? buys + sells : null;
  const buyPct = total ? Math.round((buys! / total) * 100) : null;
  const ch = s.data?.change24h ?? null;
  const steps = [["💵", "Depositas"], ["📲", "Alerta al móvil"], ["🎯", "Rebalanceas con 1 toque"]] as const;
  return <article className="hot-ring rounded-2xl p-[2px] shadow-[var(--shadow-hot)] md:col-span-2">
    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-[calc(1rem-2px)] bg-[image:var(--gradient-hot-surface)] p-4 text-hot-foreground sm:p-5">
      <div className="relative -mx-4 -mt-4 flex min-h-32 flex-col justify-between bg-[image:var(--gradient-hot)] p-4 sm:-mx-5 sm:-mt-5 sm:min-h-36 sm:p-5">
        <Sunset />
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-hot-surface px-3 py-1 text-xs font-black uppercase tracking-wide text-hot-foreground">🎰 {t("Sé la casa")}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-hot-surface/70 px-2.5 py-1 text-[11px] font-bold uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hot motion-reduce:animate-none" />{t("En vivo")}</span>
        </div>
        <h3 className="relative mt-5 flex items-center gap-2"><img src={lang === "en" ? titleEn : titleEs} alt={t(vault.name)} width={lang === "en" ? 935 : 1074} height={lang === "en" ? 233 : 228} className="h-10 w-auto max-w-[78%] -rotate-2 sm:h-14" /></h3>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-hot-muted">{vault.pair}</p>
          <p className="mt-1 max-w-sm text-sm font-semibold">{t("Deposita, recibe la alerta en Telegram y rebalancea con 1 botón para mantener tu capital concentrado donde más comisiones se cobran.")}</p>
        </div>
        <div className="text-right">
          <p key={apr ?? "x"} className="animate-count-pop bg-[image:var(--gradient-hot)] bg-clip-text font-display text-5xl font-black leading-none text-transparent tabular-nums">{apr == null ? "—" : `${apr.toLocaleString("es-MX", { maximumFractionDigits: 0 })}%`}</p>
          <p className="mt-1 text-[11px] font-medium text-hot-muted">{y.isPending ? t("Consultando el pool…") : t("APR estimado · comisiones 24 h")}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[[t("Comisiones hoy"), usd(y.data?.fees24h)], [t("Intercambios hoy"), num(total)], [t("Poseedores"), num(y.data?.holders)]].map(([k, v]) => <div key={k} className="rounded-xl border border-hot-foreground/15 bg-hot-surface/60 p-2.5 backdrop-blur-sm">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-hot-muted">{k}</dt>
          <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">{v}</dd>
        </div>)}
      </dl>
      {buyPct != null && <div className="mt-3" aria-label={t("Presión de mercado · 24 h")}>
        <div className="flex justify-between text-[11px] font-bold"><span className="text-primary">▲ {t("Compras")} {buyPct}%</span>{ch != null && <span className={ch >= 0 ? "text-primary" : "text-destructive"}>{ch >= 0 ? "+" : ""}{ch.toFixed(1)}% · 24 h</span>}<span className="text-destructive">{100 - buyPct}% {t("Ventas")} ▼</span></div>
        <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-hot-foreground/10"><div className="bg-primary transition-all" style={{ width: `${buyPct}%` }} /><div className="flex-1 bg-destructive" /></div>
      </div>}
      <ol className="mt-4 grid grid-cols-3 gap-2">{steps.map(([icon, label]) => <li key={label} className="flex flex-col items-center gap-1 rounded-xl bg-hot-surface/60 px-1 py-2 backdrop-blur-sm text-center text-[11px] font-bold leading-tight sm:flex-row sm:px-2 sm:text-left sm:text-xs"><span className="text-base">{icon}</span>{t(label)}</li>)}</ol>
      {ownedLink}
      {owned}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <button type="button" onClick={onDetails} className="h-12 rounded-xl border border-hot-foreground/25 bg-hot-foreground/10 px-4 text-sm font-semibold transition hover:bg-hot-foreground/20">{t("Detalles del pool")}</button>
        <button type="button" disabled={depositDisabled} onClick={onDeposit} className="hot-cta flex h-12 items-center justify-center gap-2 rounded-xl font-display text-base font-black text-hot-surface shadow-[var(--shadow-hot)] transition active:scale-95 disabled:opacity-70">{hasPosition ? <><Plus size={18} strokeWidth={3} />{t("Añadir más")}</> : t("Depositar")}</button>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-hot-muted">{t("No apuestas contra nadie: cobras comisiones de los intercambios. Tu saldo sube y baja con el precio de GTA6. Sin vínculo con Rockstar Games.")}</p>
    </div>
  </article>;
}
