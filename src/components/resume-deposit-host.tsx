import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isOperableVault } from "@/lib/solana-data";
import { clearResumeDeposit, fitResumeAmount, peekResumeDeposit } from "@/lib/resume-deposit";
import { DepositSimulation } from "@/components/deposit-simulation";

/**
 * Step 3 after topping up: the deposit chosen before Coinbase waits here (always mounted in Billetera, even at $0)
 * until the dollars arrive, then reopens on «Todo listo» with an amount that fits what actually arrived.
 */
export function ResumeDepositHost({ wallet, usdc, checkedAt, onClose }: { wallet: string; usdc: bigint | undefined; checkedAt: number; onClose: () => void }) {
  const t = useT();
  const [deposit, setDeposit] = useState<{ vault: Vault; amount: string; position?: string; migrate?: boolean } | null>(null);
  const [waitingFor, setWaitingFor] = useState<Vault | null>(null);
  useEffect(() => {
    if (deposit) return;
    const r = peekResumeDeposit();
    const v = r ? VAULTS.find((x) => x.id === r.vaultId) : undefined;
    if (!r || !v || !isOperableVault(v.id)) { if (r) clearResumeDeposit(); setWaitingFor(null); return; }
    if (usdc === undefined || usdc === 0n) { setWaitingFor(v); return; }
    clearResumeDeposit(); setWaitingFor(null);
    setDeposit({ vault: v, amount: fitResumeAmount(r.amount, usdc), ...(r.position ? { position: r.position } : {}), ...(r.migrate ? { migrate: true } : {}) });
  }, [usdc, checkedAt, deposit]);
  return <>
    {waitingFor && !deposit && <p role="status" className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-medium"><RefreshCw size={16} className="shrink-0 animate-spin text-primary motion-reduce:animate-none" />{t("Esperando tus dólares para {v}. Cuando lleguen, te mostramos «Todo listo».", { v: t(waitingFor.name) })}</p>}
    {deposit && <DepositSimulation key={`${deposit.vault.id}-${deposit.position ?? "new"}`} vault={deposit.vault} wallet={wallet} {...(deposit.position ? { position: deposit.position } : {})} initialAmount={deposit.amount} migrate={Boolean(deposit.migrate)} resumed onClose={() => { setDeposit(null); onClose(); }} />}
  </>;
}
