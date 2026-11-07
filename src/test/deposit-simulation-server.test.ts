// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { Buffer } from "buffer";
import { PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { FEE_WALLET } from "@/lib/fees";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";

const mocks = vi.hoisted(() => ({ connection: { getGenesisHash: vi.fn(), getLatestBlockhash: vi.fn(), getAddressLookupTable: vi.fn(), simulateTransaction: vi.fn(), sendRawTransaction: vi.fn() }, getAccount: vi.fn(), pool: vi.fn(), deposit: vi.fn(), decode: vi.fn() }));
vi.mock("@/lib/solana-read.server", () => ({ heliusConnection: () => mocks.connection }));
vi.mock("@solana/spl-token", async (original) => ({ ...await original<typeof import("@solana/spl-token")>(), getAccount: mocks.getAccount }));
vi.mock("@meteora-ag/cp-amm-sdk", async (original) => {
  const actual = await original<typeof import("@meteora-ag/cp-amm-sdk")>();
  return { ...actual, CpAmm: class {
    fetchPoolState = mocks.pool;
    getDepositQuote = () => ({ outputAmount: new BN(10) });
    getLiquidityDelta = () => new BN(1000);
    createPositionAndAddLiquidity = mocks.deposit;
  }, cpAmmCoder: { accounts: { decode: mocks.decode } } };
});
import { simulateDeposit } from "@/lib/deposit-simulation.server";

describe("unsigned composed deposit simulation", () => {
  const wallet = FEE_WALLET;
  const usdc = new PublicKey(USDC_MINT);
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.connection.getGenesisHash.mockResolvedValue("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
    mocks.connection.getLatestBlockhash.mockResolvedValue({ blockhash: USDC_MINT });
    mocks.pool.mockResolvedValue({ tokenAMint: new PublicKey(CHAIN_POOLS[1].mint), tokenBMint: usdc, tokenAFlag: 0, tokenBFlag: 0, sqrtPrice: new BN(1), sqrtMinPrice: new BN(1), sqrtMaxPrice: new BN(2), collectFeeMode: 0, tokenAAmount: new BN(1), tokenBAmount: new BN(1), liquidity: new BN(1) });
    let reads = 0;
    mocks.getAccount.mockImplementation(async () => { if (reads++ === 0) return { amount: 2_000_000n }; throw new Error("Absent fee account"); });
    mocks.deposit.mockImplementation(async (params) => {
      mocks.decode.mockReturnValue({ pool: params.pool, nftMint: params.positionNft, unlockedLiquidity: new BN(995) });
      return new Transaction().add(new TransactionInstruction({ programId: new PublicKey(CHAIN_POOLS[1].pool), keys: [], data: Buffer.from([7]) }));
    });
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint: usdc, owner: new PublicKey(FEE_WALLET), amount: 10_000n, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
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
  it("simulates fee, Jupiter and Meteora in one message without sending", async () => {
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.success).toBe(true);
    expect(result.sent).toBe(false);
    expect(result.checks).toEqual({ fee: true, position: true });
    expect(result.fee).toBe("0.01");
    const [tx, options] = mocks.connection.simulateTransaction.mock.calls[0] ?? [];
    expect(tx).toBeInstanceOf(VersionedTransaction);
    expect(options.sigVerify).toBe(false);
    expect(options.replaceRecentBlockhash).toBe(true);
    expect(tx.message.compiledInstructions).toHaveLength(5);
    expect(options.accounts.addresses[0]).toBe(getAssociatedTokenAddressSync(usdc, new PublicKey(FEE_WALLET)).toBase58());
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
  it("does not call simulation after a wrong genesis", async () => {
    mocks.connection.getGenesisHash.mockResolvedValue("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG");
    expect((await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" })).success).toBe(false);
    expect(mocks.connection.simulateTransaction).not.toHaveBeenCalled();
  });
  it("does not report success when Solana rejects the atomic transaction", async () => {
    mocks.connection.simulateTransaction.mockResolvedValue({ context: { slot: 123 }, value: { err: { InstructionError: [4, "Custom"] } } });
    const result = await simulateDeposit("test-credential", { wallet, vaultId: "met", amount: "1" });
    expect(result.success).toBe(false);
    expect(result.stage).toBe("simulation");
    expect(mocks.connection.sendRawTransaction).not.toHaveBeenCalled();
  });
});