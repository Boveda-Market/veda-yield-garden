export type ActivityKind = "swap" | "predict_claim" | "predict_buy" | "predict_fill" | "predict_sell" | "predict_close" | "predict_cancel" | "predict_unfilled" | "vault_deposit" | "vault_harvest" | "vault_exit" | "vault_rebalance" | "autopilot_compound" | "transfer" | "other";
export type WalletActivity = { signature: string; at: number | null; failed: boolean; status: string; kind: ActivityKind };

const PREDICT = "3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp";
const VAULT = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
const DLMM = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
// The current token programs no longer log instruction names, so a top-level invoke is the only signal of a plain token move.
const TOKEN = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const SYSTEM = "11111111111111111111111111111111";
const SWAP = ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB"];

/** Classifies a transaction from its program invocations and instruction log names. */
export function classifyActivity(logs: string[]): ActivityKind {
  const programs = new Set<string>();
  const ix: string[] = [];
  for (const l of logs) {
    const m = /^Program (\w+) invoke \[1\]/.exec(l);
    if (m) programs.add(m[1]!);
    const i = /Instruction: (\w+)/.exec(l);
    if (i) ix.push(i[1]!);
  }
  const has = (re: RegExp) => ix.some((n) => re.test(n));
  if (logs.some((l) => l.includes("boveda:autopilot"))) return "autopilot_compound";
  if (programs.has(PREDICT)) {
    if (has(/^ClaimPayout/)) return "predict_claim";
    if (has(/SellOrder/)) return "predict_sell";
    if (has(/^CreateOrder/)) return "predict_buy";
    // A fill that logs "Order failed" did not open a position; the venue refunds it right after with CloseOrder.
    if (has(/^FillBuyOrder/)) return logs.some((l) => /Order failed/.test(l)) ? "predict_unfilled" : "predict_fill";
    // CloseOrder also follows normal fills (returns leftover change); only a failed fill means a refund.
    if (has(/^CloseOrder/)) return "predict_cancel";
    return "predict_close";
  }
  if (programs.has(VAULT) || programs.has(DLMM)) {
    const exits = has(/^RemoveAllLiquidity|^RemoveLiquidity|^ClosePosition/);
    const adds = has(/^AddLiquidity|^CreatePosition|^InitializePosition/);
    if (exits && adds) return "vault_rebalance";
    if (exits) return "vault_exit";
    if (adds) return "vault_deposit";
    if (has(/^ClaimPositionFee|^ClaimFee|^ClaimReward/)) return "vault_harvest";
  }
  if (SWAP.some((p) => programs.has(p))) return "swap";
  if (has(/^Transfer/) || programs.has(SYSTEM) || TOKEN.some((p) => programs.has(p))) return "transfer";
  return "other";
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  swap: "Cambio (swap)",
  predict_claim: "Sube/Baja · premio reclamado",
  predict_buy: "Sube/Baja · predicción enviada",
  predict_fill: "Sube/Baja · predicción abierta",
  predict_sell: "Sube/Baja · posición vendida",
  predict_close: "Sube/Baja · posición cerrada",
  predict_unfilled: "Sube/Baja · orden no completada (reembolsada)",
  predict_cancel: "Sube/Baja · orden finalizada",
  vault_deposit: "Depósito en bóveda",
  vault_harvest: "Cosecha de ganancias",
  vault_exit: "Cierre y liquidación",
  vault_rebalance: "Rebalanceo de bóveda",
  autopilot_compound: "⚡ Auto-Compound · Piloto Automático",
  transfer: "Envío / transferencia",
  other: "Otra transacción",
};
