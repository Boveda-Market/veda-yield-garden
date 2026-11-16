import { ArrowRightLeft } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isOperableVault, type ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";

/** One button: choose the destination vault, approve, and the app closes this position and deposits everything there (0% BÓVEDA fee). */
export function MigratePicker({ position, aprs, onPick }: { position: ChainPosition; aprs: Record<string, number | null>; onPick: (p: ChainPosition, v: Vault) => void }) {
  const t = useT();
  const options = VAULTS.filter((v) => v.id !== position.vaultId && isOperableVault(v.id));
  if (options.length === 0) return null;
  // Opens the quote right away with the highest-APR destination preselected; the user can switch it there.
  const best = [...options].sort((a, b) => (aprs[b.id] ?? -1) - (aprs[a.id] ?? -1))[0]!;
  return <Button size="sm" variant="outline" className="col-span-2" onClick={() => onPick(position, best)}><ArrowRightLeft size={14} />{t("Cambiar de bóveda")}</Button>;
}
