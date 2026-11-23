// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { Buffer } from "buffer";
import { PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { FEE_WALLET } from "@/lib/fees";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";
import { getTransactionDecoder, getTransactionEncoder } from "@solana/kit";
import { ed25519 } from "@noble/curves/ed25519.js";

// Plumbing tests: 1 USDC deposits stay fee-free here; the progressive fee tiers itself is covered in fees tests.
vi.mock("@/lib/fees", async (orig) => { const m = await orig<typeof import("@/lib/fees")>(); return { ...m, depositFee: (u: bigint) => (u <= 2_000_000n ? 0n : m.depositFee(u)) }; });
const mocks = vi.hoisted(() => ({ connection: { getGenesisHash: vi.fn(), getBalance: vi.fn(), getLatestBlockhash: vi.fn(), getAddressLookupTable: vi.fn(), simulateTransaction: vi.fn(), sendRawTransaction: vi.fn() }, getAccount: vi.fn(), pool: vi.fn(), deposit: vi.fn(), decode: vi.fn() }));
vi.mock("@/lib/solana-read.server", () => ({ heliusConnection: () => mocks.connection }));
vi.mock("@solana/spl-token", async (original) => ({ ...await original<typeof import("@solana/spl-token")>(), getAccount: mocks.getAccount }));
vi.mock("@meteora-ag/cp-amm-sdk/dist/index.js", async (original) => {
  const actual = await original<typeof import("@meteora-ag/cp-amm-sdk/dist/index.js")>();
  return { ...actual, CpAmm: class {
    fetchPoolState = mocks.pool;
    getDepositQuote = () => ({ outputAmount: new BN(10) });
    getLiquidityDelta = () => new BN(1000);
    createPositionAndAddLiquidity = mocks.deposit;
    getPositionsByUser = async () => [];
  }, cpAmmCoder: { accounts: { decode: mocks.decode } } };
});
import { simulateDeposit } from "@/lib/deposit-simulation.server";

describe("unsigned composed deposit simulation", () => {
  const wallet = FEE_WALLET;
  const usdc = new PublicKey(USDC_MINT);
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.connection.getGenesisHash.mockResolvedValue("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
    mocks.connection.getBalance.mockResolvedValue(20_000_000);
    mocks.connection.getLatestBlockhash.mockResolvedValue({ blockhash: USDC_MINT });
    mocks.pool.mockResolvedValue({ tokenAMint: new PublicKey(CHAIN_POOLS[1].mint), tokenBMint: usdc, tokenAFlag: 0, tokenBFlag: 0, sqrtPrice: new BN(1), sqrtMinPrice: new BN(1), sqrtMaxPrice: new BN(2), collectFeeMode: 0, tokenAAmount: new BN(1), tokenBAmount: new BN(1), liquidity: new BN(1) });
    let reads = 0;
    mocks.getAccount.mockImplementation(async () => { if (reads++ === 0) return { amount: 2_000_000n }; throw new Error("Absent fee account"); });
    mocks.deposit.mockImplementation(async (params) => {
      mocks.decode.mockImplementation((name: string) => {
        // Mirror the raw IDL coder: PascalCase account name, snake_case fields.
        if (name !== "Position") throw new Error(`Account not found: ${name}`);
        return { pool: params.pool, nft_mint: params.positionNft, unlocked_liquidity: new BN(995) };
      });
      return new Transaction().add(new TransactionInstruction({ programId: new PublicKey(CHAIN_POOLS[1].pool), keys: [{ pubkey: params.positionNft, isSigner: true, isWritable: true }], data: Buffer.from([7]) }));
    });
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint: usdc, owner: new PublicKey(wallet), amount: 1_000_000n, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
    mocks.connection.simulateTransaction.mockResolvedValue({ context: { slot: 123 }, value: { err: null, unitsConsumed: 500_000, accounts: [{ owner: TOKEN_PROGRAM_ID.toBase58(), data: [data.toString("base64"), "base64"] }, { data: ["AA==", "base64"] }] } });
    vi.stubGlobal("fetch", vi.fn(async (url, options) => {
      if (String(url).includes("quote?")) {
        const amount = new URL(String(url)).searchParams.get("amount");
        return Response.json({ inputMint: USDC_MINT, outputMint: CHAIN_POOLS[1].mint, inAmount: amount, outAmount: "100", otherAmountThreshold: "99", swapMode: "ExactIn", routePlan: [{ swapInfo: { ammKey: CHAIN_POOLS[0].pool } }] });
      }
      expect(JSON.parse(options.body).userPublicKey).toBe(wallet);
      return Response.json({ setupInstructions: [], swapInstruction: { programId: CHAIN_POOLS[0].pool, accounts: [], data: "AQ==" }, addressLookupTableAddresses: [] });
    }));
  });
  it("simulates Jupiter and Meteora with 0% entry fee and no fee instructions", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.success).toBe(true);
    expect(result.sent).toBe(false);
    expect(result.checks).toEqual({ fee: true, position: true });
    expect(result.fee).toBe("0");
    expect(result.net).toBe("1");
    const [tx, options] = mocks.connection.simulateTransaction.mock.calls[1] ?? [];
    expect(tx).toBeInstanceOf(VersionedTransaction);
    expect(options.sigVerify).toBe(false);
    expect(options.replaceRecentBlockhash).toBe(true);
    expect(tx.message.compiledInstructions).toHaveLength(4);
    expect(mocks.getAccount).toHaveBeenCalledTimes(1);
    expect(tx.message.compiledInstructions.some((ix: { programIdIndex: number }) => tx.message.staticAccountKeys[ix.programIdIndex].equals(TOKEN_PROGRAM_ID))).toBe(false);
    expect(options.accounts.addresses[0]).toBe(getAssociatedTokenAddressSync(usdc, new PublicKey(FEE_WALLET)).toBase58());
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("does not call simulation after a wrong genesis", async () => {
    mocks.connection.getGenesisHash.mockResolvedValue("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
    expect((await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" })).success).toBe(false);
    expect(mocks.connection.simulateTransaction).not.toHaveBeenCalled();
  });
  it("does not read or create the fee ATA even when it already exists", async () => {
    mocks.getAccount.mockReset();
    mocks.getAccount.mockResolvedValueOnce({ amount: 2_000_000n }).mockResolvedValueOnce({ mint: usdc, owner: new PublicKey(FEE_WALLET), amount: 0n });
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.success).toBe(true);
    const [tx] = mocks.connection.simulateTransaction.mock.calls[0] ?? [];
    expect(tx.message.compiledInstructions).toHaveLength(4);
    expect(mocks.getAccount).toHaveBeenCalledTimes(1);
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("stops before Jupiter when the wallet has under 0.015 SOL", async () => {
    mocks.connection.getBalance.mockResolvedValue(14_999_999);
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" }, { preparePilot: true });
    expect(result.success).toBe(false);
    // "reserve" makes the deposit screen offer the one-tap reserve top-up.
    expect(result.stage).toBe("reserve");
    expect(result.prepared).toBeUndefined();
    expect(mocks.connection.simulateTransaction).not.toHaveBeenCalled();
  });
  it("plain simulations never return transaction bytes", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.prepared).toBeUndefined();
  });
  it("pilot returns the verified message without sending it", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" }, { preparePilot: true });
    expect(result.success).toBe(true);
    if (!result.prepared) throw new Error("Missing prepared transaction");
    expect(VersionedTransaction.deserialize(Buffer.from(result.prepared.transaction, "base64")).message.compiledInstructions).toHaveLength(4);
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("preserves a valid NFT signature in Privy's transaction codec while leaving the owner unsigned", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" }, { preparePilot: true });
    if (!result.prepared) throw new Error("Missing prepared transaction");
    const wire = Buffer.from(result.prepared.transaction, "base64");
    const tx = VersionedTransaction.deserialize(wire);
    const ownerIndex = tx.message.staticAccountKeys.findIndex(key => key.toBase58() === wallet);
    expect(ownerIndex).toBe(0);
    expect(tx.signatures[ownerIndex]?.every(byte => byte === 0)).toBe(true);
    const nftIndex = tx.message.staticAccountKeys.findIndex((key, index) => index < tx.message.header.numRequiredSignatures && key.toBase58() !== wallet);
    const nftSignature = tx.signatures[nftIndex];
    const nftKey = tx.message.staticAccountKeys[nftIndex];
    if (!nftSignature || !nftKey) throw new Error("Missing NFT signer");
    expect(ed25519.verify(nftSignature, tx.message.serialize(), nftKey.toBytes())).toBe(true);
    const decoded = getTransactionDecoder().decode(wire);
    expect(new Uint8Array(getTransactionEncoder().encode(decoded))).toEqual(new Uint8Array(wire));
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("pilot refuses deposits over 5,000 USDC", async () => {
    await expect(simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "5000.000001" }, { preparePilot: true })).rejects.toThrow();
    expect(mocks.connection.simulateTransaction).not.toHaveBeenCalled();
  });
  it("charges no fee on a verified 5,000 USDC deposit without sending", async () => {
    mocks.getAccount.mockReset();
    mocks.getAccount.mockResolvedValue({ amount: 5_000_000_000n });
    const fee = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint: usdc, owner: new PublicKey(FEE_WALLET), amount: 5_000_000_000n, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, fee);
    const base = await mocks.connection.simulateTransaction();
    mocks.connection.simulateTransaction.mockResolvedValue({ ...base, value: { ...base.value, accounts: [...base.value.accounts, { owner: TOKEN_PROGRAM_ID.toBase58(), data: [fee.toString("base64"), "base64"] }] } });
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "5000" }, { preparePilot: true });
    expect(result.success).toBe(true);
    expect(result.prepared).toBeDefined();
    expect(result.fee).toBe("0");
    expect(result.net).toBe("5000");
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("does not prepare 5,000 USDC when the wallet only has 2 USDC", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "5000" }, { preparePilot: true });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(mocks.connection.simulateTransaction).not.toHaveBeenCalled();
  });
  it("does not widen signable vaults to Token-2022", async () => {
    await expect(simulateDeposit("test-credential", { wallet, vaultId: "rwa" as never, amount: "5000" }, { preparePilot: true })).rejects.toThrow();
  });
  it("pilot returns nothing when Solana rejects the simulation", async () => {
    mocks.connection.simulateTransaction.mockResolvedValue({ context: { slot: 123 }, value: { err: { InstructionError: [4, "Custom"] } } });
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" }, { preparePilot: true });
    expect(result.prepared).toBeUndefined();
  });
  it("does not report success when Solana rejects the atomic transaction", async () => {
    mocks.connection.simulateTransaction.mockResolvedValue({ context: { slot: 123 }, value: { err: { InstructionError: [4, "Custom"] } } });
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.success).toBe(false);
    expect(result.stage).toBe("simulation");
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
});