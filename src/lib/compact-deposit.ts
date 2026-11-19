import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";

/** Only repeated idempotent ATA creation is removable; never deduplicate actions. */
export function compactDepositInstructions(instructions: TransactionInstruction[]) {
  const seen = new Set<string>();
  return instructions.filter((ix) => {
    if (!ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) || ix.data.length !== 1 || ix.data[0] !== 1) return true;
    const identity = ix.keys.map((key) => `${key.pubkey.toBase58()}:${Number(key.isSigner)}:${Number(key.isWritable)}`).join("|");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
/** Removes idempotent ATA-creation instructions (data [1]) whose target account (key 1) is known to exist already. */
export function dropExistingAtaCreates(instructions: TransactionInstruction[], existing: Set<string>) {
  return instructions.filter((ix) => !(ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) && ix.data.length === 1 && ix.data[0] === 1 && existing.has(ix.keys[1]?.pubkey.toBase58() ?? "")));
}
