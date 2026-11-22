import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isOperableVault } from "@/lib/solana-data";
import { clearResumeDeposit, peekResumeDeposit, peekResumePlay, resumeStep } from "@/lib/resume-deposit";
import { DepositSimulation } from "@/components/deposit-simulation";

/**
 * Return from Coinbase (lands on Billetera): the deposit or Doble o Nada play chosen before paying waits here until
 * the NEW dollars arrive (more than the wallet held before the purchase). Then the deposit reopens on its normal card with
 * a live quote, or the person is taken back to Doble o Nada where the same play reopens with a fresh quote for the open round.
 */
export function ResumeDepositHost({ wallet, usdc, checkedAt, onClose, onPoll }: { wallet: string; usdc: bigint | undefined; checkedAt: number; onClose: () => void; onPoll?: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [deposit, setDeposit] = useState<{ vault: Vault; amount: string; position?: string; migrate?: boolean } | null>(null);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  useEffect(() => {
    if (deposit) return;
    let dep = peekResumeDeposit();
    const v = dep ? VAULTS.find((x) => x.id === dep!.vaultId) : undefined;
    if (dep && (!v || !isOperableVault(v.id))) { clearResumeDeposit(); dep = null; }
    const step = resumeStep(peekResumePlay(), dep, usdc);
    if (step.kind === "wait") { setWaitingFor(step.for === "play" ? t("tu jugada") : t(v!.name)); return; }
    setWaitingFor(null);
    // The play itself reopens on Doble o Nada, which takes the entry once its ticket is open.
    if (step.kind === "play") { void navigate({ to: "/mercados" }); return; }
    if (step.kind === "deposit" && v) { clearResumeDeposit(); setDeposit({ vault: v, amount: step.amount, ...(step.position ? { position: step.position } : {}), ...(step.migrate ? { migrate: true } : {}) }); }
  }, [usdc, checkedAt, deposit]); // eslint-disable-line react-hooks/exhaustive-deps
  // While waiting, check the balance every 4 s instead of the normal 20 s.
  useEffect(() => { if (!waitingFor || !onPoll) return; const id = setInterval(onPoll, 4_000); return () => clearInterval(id); }, [waitingFor, onPoll]);
  return <>
    {waitingFor && !deposit && <p role="status" className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-medium"><RefreshCw size={16} className="shrink-0 animate-spin text-primary motion-reduce:animate-none" />{t("Esperando tus dólares para {v}. Cuando lleguen, seguimos donde ibas.", { v: waitingFor })}</p>}
    {deposit && <DepositSimulation key={`${deposit.vault.id}-${deposit.position ?? "new"}`} vault={deposit.vault} wallet={wallet} {...(deposit.position ? { position: deposit.position } : {})} initialAmount={deposit.amount} migrate={Boolean(deposit.migrate)} resumed onClose={() => { setDeposit(null); onClose(); }} />}
  </>;
}
