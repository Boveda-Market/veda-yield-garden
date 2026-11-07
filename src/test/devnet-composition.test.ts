// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { decodeTransferCheckedInstruction } from "@solana/spl-token";
import { composeDevnetDeposit, DEVNET_GENESIS, requireDevnet, testDepositAmounts } from "@/lib/devnet-composition";
import { FEE_WALLET } from "@/lib/fees";

describe("Devnet composed deposit", () => {
  it("charges exactly 1 test-USDC from a gross 100, leaving 99", () => {
    expect(testDepositAmounts(100_000_000n)).toEqual({ gross: 100_000_000n, fee: 1_000_000n, net: 99_000_000n });
    expect(testDepositAmounts(99n).fee).toBe(0n);
  });
  it("refuses mainnet even if a caller asks to compose", () => {
    expect(() => requireDevnet("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")).toThrow();
    expect(() => requireDevnet(DEVNET_GENESIS)).not.toThrow();
  });
  it("puts the fee, swap and deposit into the same signed message", () => {
    const owner = new PublicKey(FEE_WALLET);
    const mint = new PublicKey("So11111111111111111111111111111111111111112");
    const marker = (byte: number) => new TransactionInstruction({ programId: owner, keys: [], data: Buffer.from([byte]) });
    const result = composeDevnetDeposit({ genesis: DEVNET_GENESIS, owner, testUsdcMint: mint,
      blockhash: PublicKey.default.toBase58(), gross: 100_000_000n, swap: [marker(31)], deposit: [marker(32)] });
    const message = result.transaction.message;
    expect(message.compiledInstructions.map((ix) => Array.from(ix.data)).slice(-2)).toEqual([[31], [32]]);
    const fee = message.compiledInstructions[2];
    if (!fee) throw new Error("Missing fee instruction");
    const keys = message.staticAccountKeys;
    const programId = keys[fee.programIdIndex];
    if (!programId) throw new Error("Missing token program");
    const decoded = decodeTransferCheckedInstruction(new TransactionInstruction({
      programId, data: Buffer.from(fee.data),
      keys: fee.accountKeyIndexes.map((index) => {
        const pubkey = keys[index];
        if (!pubkey) throw new Error("Missing fee account");
        return { pubkey, isSigner: message.isAccountSigner(index), isWritable: message.isAccountWritable(index) };
      }),
    }));
    expect(decoded.data.amount).toBe(1_000_000n);
    expect(decoded.data.decimals).toBe(6);
    expect(decoded.keys.destination.pubkey.equals(result.recipientAta)).toBe(true);
  });
  it("rejects an oversized message instead of breaking fee atomicity", () => {
    const owner = new PublicKey(FEE_WALLET);
    expect(() => composeDevnetDeposit({ genesis: DEVNET_GENESIS, owner, testUsdcMint: owner,
      blockhash: PublicKey.default.toBase58(), gross: 100n,
      swap: [new TransactionInstruction({ programId: owner, keys: [], data: Buffer.alloc(1300) })], deposit: [] })).toThrow();
  });
});