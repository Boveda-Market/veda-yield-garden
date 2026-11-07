// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { compactDepositInstructions } from "@/lib/compact-deposit";
import { FEE_WALLET } from "@/lib/fees";
import { USDC_MINT } from "@/lib/solana-data";

describe("atomic deposit size compaction", () => {
  const owner = new PublicKey(FEE_WALLET);
  const mint = new PublicKey(USDC_MINT);
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const setup = () => createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, mint);
  const fee = () => createTransferCheckedInstruction(ata, mint, ata, owner, 10_000n, 6);
  const serialize = (instructions: TransactionInstruction[]) => new VersionedTransaction(new TransactionMessage({ payerKey: owner, recentBlockhash: USDC_MINT, instructions }).compileToV0Message()).serialize().length;

  it("reduces a 1237-byte transaction below 1232 without removing fee or deposit", () => {
    const deposit = new TransactionInstruction({ programId: mint, keys: [], data: Buffer.alloc(800) });
    const instructions = [setup(), fee(), setup(), deposit];
    const size = serialize(instructions);
    deposit.data = Buffer.alloc(deposit.data.length + 1237 - size);
    expect(serialize(instructions)).toBe(1237);
    const compact = compactDepositInstructions(instructions);
    expect(serialize(compact)).toBeLessThanOrEqual(1232);
    expect(compact).toEqual([instructions[0], instructions[1], deposit]);
  });
  it("preserves identical transfers and non-idempotent setup instructions", () => {
    const firstFee = fee(), secondFee = fee();
    const legacySetup = setup();
    legacySetup.data = Buffer.alloc(0);
    expect(compactDepositInstructions([firstFee, secondFee, legacySetup, legacySetup])).toHaveLength(4);
  });
  it("preserves distinct ATA creation and differing account privileges", () => {
    const different = createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, owner);
    const privileges = setup();
    const key = privileges.keys[0];
    if (!key) throw new Error("Missing payer");
    key.isWritable = false;
    expect(compactDepositInstructions([setup(), different, privileges])).toHaveLength(3);
  });
});