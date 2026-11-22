import { z } from "zod";

/** Max age of a wallet ownership proof, so a captured signature cannot be replayed later. */
export const PROOF_MAX_AGE_MS = 10 * 60 * 1000;

export function walletProofMessage(privyId: string, wallet: string, issuedAt: string) {
  return `Bóveda Market: confirmo que esta wallet es mía.\nCuenta: ${privyId}\nWallet: ${wallet}\nFecha: ${issuedAt}\nNo mueve fondos ni cuesta nada.`;
}

const b58 = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]+$/);
export const walletProofRequest = z.object({
  token: z.string().min(20).max(12000),
  wallet: b58.min(32).max(44),
  issuedAt: z.string().datetime(),
  signature: b58.min(64).max(90),
}).strict();

/** Pure check: message fields bound to this account/wallet and fresh. */
export function proofIsFresh(issuedAt: string, now = Date.now()) {
  const t = Date.parse(issuedAt);
  return Number.isFinite(t) && t <= now + 60_000 && now - t <= PROOF_MAX_AGE_MS;
}
