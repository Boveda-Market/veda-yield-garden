import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isOperableVault, type ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";

/** One button: choose the destination vault, approve, and the app closes this position and deposits everything there (0% BÓVEDA fee). */
export function MigratePicker({ position, aprs, onPick }: { position: ChainPosition; aprs: Record<string, number | null>; onPick: (p: ChainPosition, v: Vault) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Vault | null>(null);
  const options = VAULTS.filter((v) => v.id !== position.vaultId && isOperableVault(v.id));
  if (options.length === 0) return null;
  return <>
    <Button size="sm" variant="outline" className="col-span-2" onClick={() => { setTarget(null); setOpen(true); }}><ArrowRightLeft size={14} />{t("Migrar bóveda")}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent>
        <DialogHeader><DialogTitle>{t("Migrar bóveda")}</DialogTitle><DialogDescription>{t("Elige a dónde mover todo tu dinero y ganancias. Lo hacemos por ti con 0% de comisión de BÓVEDA.")}</DialogDescription></DialogHeader>
        <div role="radiogroup" aria-label={t("Bóveda destino")} className="grid gap-2">{options.map((v) => {
          const apr = aprs[v.id];
          return <button key={v.id} type="button" role="radio" aria-checked={target?.id === v.id} onClick={() => setTarget(v)} className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm ${target?.id === v.id ? "border-primary bg-primary/10" : "border-border"}`}>
            <span className="font-semibold">{t(v.name)}</span>
            <span className="tabular-nums text-primary">{apr == null ? "—" : `${apr.toFixed(1)}% APR`}</span>
          </button>;
        })}</div>
        {target && <p className="text-xs leading-5 text-muted-foreground">{t("Moveremos todo a {v}. Tu wallet te pedirá aprobar dos veces: cerrar esta bóveda y depositar en la nueva.", { v: t(target.name) })}</p>}
        <Button size="lg" disabled={!target} onClick={() => { if (target) { setOpen(false); onPick(position, target); } }}>{t("Aprobar migración")}</Button>
      </ActionSheetContent>
    </Dialog>
  </>;
}
