import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import { bitcoinStatsOptions } from "@/lib/bitcoin-stats";
import { formatCoinPrice } from "@/lib/format-price";
import { TokenIcon } from "@/components/token-icon";

const COINS = { btc: { name: "Bitcoin", symbol: "BTC" }, trump: { name: "Trump Coin", symbol: "TRUMP" }, gta6: { name: "GTA6 Coin", symbol: "GTA6" } } as const;
export type MarketCoin = keyof typeof COINS;

const short = (v: number | null | undefined) => v == null ? "—" : v >= 1e9 ? `$${(v / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })}B` : v >= 1e6 ? `$${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M` : `$${Math.round(v).toLocaleString("en-US")}`;
const count = (v: number | null | undefined) => v == null ? "—" : v >= 1e6 ? `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M` : Math.round(v).toLocaleString("en-US");

/** Home versions: live coin facts (price + 24 h change, 24 h volume, liquidity, holders) from the vault pool, missing values shown as «—». */
export function HomeMarketCard({ coin = "btc" }: { coin?: MarketCoin }) {
  const t = useT();
  const pool = VAULTS.find((v) => v.id === coin)?.pool ?? "";
  const { name, symbol } = COINS[coin];
  const stats = useQuery({ queryKey: ["dexscreener-pool-stats", pool], queryFn: ({ signal }) => fetchPoolStats(pool, signal), staleTime: 60_000, refetchInterval: 60_000, retry: 1, enabled: Boolean(pool) }).data;
  const y = useQuery({ ...poolYieldOptions(pool), enabled: Boolean(pool) && coin !== "btc" }).data;
  const btc = useQuery({ ...bitcoinStatsOptions(), enabled: coin === "btc" }).data;
  const ch = stats?.change24h ?? null;
  const up = (ch ?? 0) >= 0;
  const holders = coin === "btc" ? btc?.holders : y?.holders;
  const tiles: [string, React.ReactNode][] = [
    [t("Precio"), <>{stats?.price != null ? formatCoinPrice(stats.price) : "—"}{ch != null && <span className={`mt-1 block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold ${up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{up ? "▲ +" : "▼ "}{Math.abs(ch).toFixed(1)}%</span>}</>],
    [t("Volumen 24 h"), short(stats?.volume24h)],
    [t("Liquidez"), short(stats?.liquidityUsd)],
    ["Holders", count(holders)],
  ];
  return <section aria-label={`${name} · ${t("Datos en vivo")}`} className="mt-2 rounded-3xl border border-border bg-card p-4" data-testid="home-market-card">
    <div className="flex items-center gap-2">
      <TokenIcon symbol={symbol} size={32} />
      <p className="font-display text-sm font-bold">{name} <span className="font-normal text-muted-foreground">· {t("Datos en vivo")}</span></p>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map(([k, v]) => <div key={k} className="rounded-2xl bg-muted/50 px-3 py-2.5"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-0.5 font-display text-lg font-extrabold tabular-nums">{v}</dd></div>)}
    </dl>
    <Link to="/app" hash={`open-${coin}`} className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95">👉 {t("Oprime aquí para ver la bóveda")}</Link>
  </section>;
}
