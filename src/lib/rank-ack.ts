import { VAULTS } from "@/lib/vaults";
import { isDlmmVault } from "@/lib/solana-data";

export const RANK_ACKED = "boveda:rank-acked";
/** After any vault move: silence the ranking popup until a new high-octane vault is added. */
export function ackRankLineup() {
  try { localStorage.setItem(RANK_ACKED, JSON.stringify(VAULTS.filter((v) => v.badge && isDlmmVault(v.id)).map((v) => v.id))); } catch { /* ignore */ }
}
