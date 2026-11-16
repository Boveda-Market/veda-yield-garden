import { useQueries, useQuery } from "@tanstack/react-query";
import { getMigratePolicy } from "@/lib/migrate-policy.functions";
import { Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { poolYieldOptions } from "@/lib/pool-yield";
import { bestUpgrade, isMigratableVault } from "@/lib/migrate";
import type { ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";

export function useMigrateEnabled() {
  const q = useQuery({ queryKey: ["migrate-policy"], queryFn: () => getMigratePolicy().catch(() => ({ enabled: false })), staleTime: 60_000 });
  return q.data?.enabled === true;
}

export function useVaultAprs() {
  const ys = useQueries({ queries: VAULTS.map((v) => poolYieldOptions(v.pool)) });
  return Object.fromEntries(VAULTS.map((v, i) => [v.id, ys[i]?.data?.apr ?? null])) as Record<string, number | null>;
}

/** Free-move offer card: shown when another vault beats this position by ≥ MIGRATE_MIN_GAIN APR points. */
export function MigrateOffer({ position, aprs, onMigrate, className = "" }: { position: ChainPosition; aprs: Record<string, number | null>; onMigrate: (p: ChainPosition, v: Vault) => void; className?: string }) {
  const t = useT();
  const enabled = useMigrateEnabled();
  if (!enabled || position.locked || !isMigratableVault(position.vaultId)) return null;
  const up = bestUpgrade(position.vaultId, aprs);
  const target = up ? VAULTS.find((v) => v.id === up.id) : null;
  const from = VAULTS.find((v) => v.id === position.vaultId);
  if (!up || !target) return null;
  return <div className={`rounded-xl border-2 border-primary bg-primary/10 p-4 ${className}`}>
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground"><Zap size={12} />{t("Traslado rápido")}</span>
    <p className="mt-3 text-sm">{t("{v} rinde", { v: t(target.name) })} <span className="font-display text-xl font-bold text-primary">+{up.gain.toFixed(1)}% APR</span> {t("más que {f}", { f: from ? t(from.name) : "" })}</p>
    <p className="mt-1 text-xs text-muted-foreground">{t("Movemos tu capital y ganancias en un solo paso. Tú firmas cada paso.")}</p>
    <Button className="mt-3 w-full" size="lg" onClick={() => onMigrate(position, target)}>{t("Migrar a {v}", { v: t(target.name) })} →</Button>
  </div>;
}

/** Top banner listing the first position with a free-move opportunity. */
export function MigrateBanner({ positions, onMigrate }: { positions: ChainPosition[]; onMigrate: (p: ChainPosition, v: Vault) => void }) {
  const aprs = useVaultAprs();
  const p = positions.find((x) => !x.locked && isMigratableVault(x.vaultId) && bestUpgrade(x.vaultId, aprs));
  return p ? <MigrateOffer position={p} aprs={aprs} onMigrate={onMigrate} className="mt-6" /> : null;
}
