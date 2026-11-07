// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { composeDevnetDeposit, DEVNET_GENESIS, requireDevnet, testDepositAmounts } from "@/lib/devnet-composition";
import { FEE_WALLET } from "@/lib/fees";

describe("Devnet composed deposit", () => {
  it("charges 0% on a gross 100 test-USDC, leaving all 100", () => {
    expect(testDepositAmounts(100_000_000n)).toEqual({ gross: 100_000_000n, fee: 0n, net: 100_000_000n });
    expect(testDepositAmounts(99n).fee).toBe(0n);
  });
  it("refuses mainnet even if a caller asks to compose", () => {
    expect(() => requireDevnet("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")).toThrow();
    expect(() => requireDevnet(DEVNET_GENESIS)).not.toThrow();
  });
  it("puts only compute budget, swap and deposit in one message without an entry fee", () => {
    const owner = new PublicKey(FEE_WALLET);
    const mint = new PublicKey("So11111111111111111111111111111111111111112");
    const marker = (byte: number) => new TransactionInstruction({ programId: owner, keys: [], data: Buffer.from([byte]) });
    const result = composeDevnetDeposit({ genesis: DEVNET_GENESIS, owner, testUsdcMint: mint,
      blockhash: PublicKey.default.toBase58(), gross: 100_000_000n, swap: [marker(31)], deposit: [marker(32)] });
    const message = result.transaction.message;
    expect(message.compiledInstructions.map((ix) => Array.from(ix.data)).slice(-2)).toEqual([[31], [32]]);
    expect(message.compiledInstructions).toHaveLength(3);
    expect(result.amounts.fee).toBe(0n);
    expect(message.staticAccountKeys.some((key) => key.equals(result.recipientAta))).toBe(false);
  });
  it("rejects an oversized message instead of breaking fee atomicity", () => {
    const owner = new PublicKey(FEE_WALLET);
    expect(() => composeDevnetDeposit({ genesis: DEVNET_GENESIS, owner, testUsdcMint: owner,
      blockhash: PublicKey.default.toBase58(), gross: 100n,
      swap: [new TransactionInstruction({ programId: owner, keys: [], data: Buffer.alloc(1300) })], deposit: [] })).toThrow();
  });
});