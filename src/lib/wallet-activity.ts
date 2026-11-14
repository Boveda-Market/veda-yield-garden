export type ActivityKind = "swap" | "predict_claim" | "predict_buy" | "predict_fill" | "predict_sell" | "predict_close" | "predict_cancel" | "predict_unfilled" | "vault_deposit" | "vault_harvest" | "vault_exit" | "transfer" | "other";
export type WalletActivity = { signature: string; at: number | null; failed: boolean; status: string; kind: ActivityKind };

const PREDICT = "3ZZuTbwC6aJbvteyVxXUS7gtFYdf7AuXeitx6VyvjvUp";
const VAULT = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
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
  if (programs.has(PREDICT)) {
    if (has(/^ClaimPayout/)) return "predict_claim";
    if (has(/SellOrder/)) return "predict_sell";
    if (has(/^CreateOrder/)) return "predict_buy";
    // A fill that logs "Order failed" did not open a position; the venue refunds it right after with CloseOrder.
    if (has(/^FillBuyOrder/)) return logs.some((l) => /Order failed/.test(l)) ? "predict_unfilled" : "predict_fill";
    if (has(/^CloseOrder/)) return "predict_cancel";
    return "predict_close";
  }
  if (programs.has(VAULT)) {
    if (has(/^RemoveAllLiquidity|^RemoveLiquidity|^ClosePosition/)) return "vault_exit";
    if (has(/^AddLiquidity|^CreatePosition/)) return "vault_deposit";
    if (has(/^ClaimPositionFee|^ClaimReward/)) return "vault_harvest";
  }
  if (SWAP.some((p) => programs.has(p))) return "swap";
  if (has(/^Transfer/) || programs.has("11111111111111111111111111111111")) return "transfer";
  return "other";
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  swap: "Cambio (swap)",
  predict_claim: "Sube/Baja · premio reclamado",
  predict_buy: "Sube/Baja · predicción enviada",
  predict_fill: "Sube/Baja · predicción abierta",
  predict_sell: "Sube/Baja · posición vendida",
  predict_close: "Sube/Baja · posición cerrada",
  predict_unfilled: "Sube/Baja · orden no completada",
  predict_cancel: "Sube/Baja · orden cancelada y reembolsada",
  vault_deposit: "Depósito en bóveda",
  vault_harvest: "Cosecha de ganancias",
  vault_exit: "Cierre y liquidación",
  transfer: "Envío / transferencia",
  other: "Otra transacción",
};
