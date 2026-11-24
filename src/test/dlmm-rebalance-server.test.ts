// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { Buffer } from "buffer";
import { Keypair, PublicKey, TransactionInstruction, VersionedTransaction, type Connection } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";
import { FEE_WALLET, harvestFee } from "@/lib/fees";

const mocks = vi.hoisted(() => ({ sdk: vi.fn(), mint: vi.fn() }));
vi.mock("@/lib/dlmm-sdk.server", () => ({ loadDlmmSdk: mocks.sdk }));
vi.mock("@/lib/compute-budget", async (original) => ({ ...await original<object>(), networkFeeOf: async () => 5000n }));
vi.mock("@solana/spl-token", async (original) => ({ ...await original<object>(), getMint: mocks.mint }));
import { simulateDlmmRebalance } from "@/lib/dlmm.server";

const owner = Keypair.generate().publicKey, position = Keypair.generate().publicKey;
const program = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const usdc = new PublicKey(USDC_MINT), feeOwner = new PublicKey(FEE_WALLET);
const ix = () => new TransactionInstruction({ programId: program, keys: [{ pubkey: owner, isSigner: true, isWritable: true }], data: Buffer.from([1]) });
function tokenAccount(amount: bigint, mint: PublicKey, accountOwner: PublicKey, tokenProgram = TOKEN_PROGRAM_ID) {
  const data = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({ mint, owner: accountOwner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
  return { owner: tokenProgram, lamports: 2_039_280, data };
}

function fixture(id: string, above: boolean, corruptCash = false) {
  const config = CHAIN_POOLS.find((p) => p.id === id);
  if (!config) throw new Error("Missing vault fixture");
  const token = new PublicKey(config.mint), poolKey = new PublicKey(config.pool);
  const tokenProgram = "tokenProgram" in config && config.tokenProgram === "token2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const baseX = above ? 0n : 200_000_000n, baseY = above ? 200_000_000n : 0n;
  const feeX = 20_000_000n, feeY = 10_000_000n;
  const cashBefore = 50_000_000n, coinBefore = 7_000_000n;
  const bovedaFee = harvestFee(feeY, baseX + baseY + feeX + feeY);
  const active = above ? 11 : -11;
  let swapIn = 0n, swapForY = true, depositX = 0n, depositY = 0n;
  const state = { feeOwner: () => PublicKey.default, lbPair: () => poolKey, owner: () => owner, lockReleasePoint: () => new BN(0), lowerBinId: () => new BN(active - 5), upperBinId: () => new BN(active + 5), liquidityShares: () => [new BN(1)] };
  const pool = {
    pubkey: poolKey, program: { programId: program },
    lbPair: { activeId: active, binStep: 80, tokenXMint: token, tokenYMint: usdc, rewardInfos: [], status: 0 },
    tokenX: { owner: tokenProgram }, tokenY: { owner: TOKEN_PROGRAM_ID },
    getPosition: async () => ({ positionData: { totalXAmount: baseX.toString(), totalYAmount: baseY.toString(), feeX: new BN(feeX.toString()), feeY: new BN(feeY.toString()), lowerBinId: -10, upperBinId: 10, positionBinData: [] } }),
    claimSwapFee: async () => [{ instructions: [ix()] }], removeLiquidity: async () => [{ instructions: [ix()] }],
    getBinArrayForSwap: async () => [],
    swapQuote: (amount: BN) => ({ priceImpact: new BN(0), minOutAmount: amount, binArraysPubkey: [] }),
    swap: vi.fn(async (input: { inAmount: BN; inToken: PublicKey }) => { swapIn = BigInt(input.inAmount.toString()); swapForY = input.inToken.equals(token); return { instructions: [ix()] }; }),
    simulateRebalancePositionWithBalancedStrategy: vi.fn(async (_p: unknown, _d: unknown, _s: unknown, x: BN, y: BN) => { depositX = BigInt(x.toString()); depositY = BigInt(y.toString()); return { binArrayCount: 0 }; }),
    rebalancePosition: async () => ({ initBinArrayInstructions: [], rebalancePositionInstruction: [ix()] }),
  };
  mocks.sdk.mockResolvedValue({ DLMM: { create: async () => pool }, wrapPosition: () => state, getPriceOfBinByBinId: () => new BN(1), StrategyType: { Spot: 0 } });
  mocks.mint.mockResolvedValue({ decimals: config.decimals, freezeAuthority: null, tlvData: Buffer.alloc(0) });
  const positionAccount = { owner: program, lamports: 40_000_000, data: Buffer.from([0]) };
  const before = [tokenAccount(cashBefore, usdc, owner), tokenAccount(coinBefore, token, owner, tokenProgram), positionAccount, { owner, lamports: 30_000_000, data: Buffer.alloc(0) }, tokenAccount(0n, usdc, feeOwner)];
  const send = vi.fn();
  const connection = {
    getGenesisHash: async () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
    getAccountInfo: async () => positionAccount, getMultipleAccountsInfo: async () => before,
    getBalance: async () => 30_000_000,
    getLatestBlockhash: async () => ({ blockhash: USDC_MINT, lastValidBlockHeight: 100 }),
    simulateTransaction: async () => {
      const cash = corruptCash ? cashBefore + 1n : cashBefore + baseY + feeY - bovedaFee + (swapForY ? swapIn : -swapIn) - depositY;
      const coin = coinBefore + baseX + feeX + (swapForY ? -swapIn : swapIn) - depositX;
      const after = [tokenAccount(cash, usdc, owner), tokenAccount(coin, token, owner, tokenProgram), positionAccount, { owner, lamports: 29_995_000, data: Buffer.alloc(0) }, tokenAccount(bovedaFee, usdc, feeOwner)];
      return { value: { err: null, unitsConsumed: 100_000, accounts: after.map((a) => ({ owner: a.owner.toBase58(), lamports: a.lamports, data: [a.data.toString("base64"), "base64"] })) } };
    },
    sendRawTransaction: send,
  } as unknown as Connection;
  return { connection, input: { wallet: owner.toBase58(), position: position.toBase58(), vaultId: config.id }, pool, send, bovedaFee };
}

beforeEach(() => vi.resetAllMocks());
describe("complete range rebalance preparation", () => {
  for (const id of ["gta6", "dcty", "trump", "btc"]) {
    it(`${id}: sells all harvested coins on a downward exit and reserves the net dollars`, async () => {
      const f = fixture(id, false);
      const result = await simulateDlmmRebalance(f.connection, f.input, { prepare: true, maxImpactPct: 1.5 });
      expect(result.success).toBe(true);
      expect(result.gainsAddedUsd).toBe("0.00");
      expect(Number(result.gainsKeptUsd)).toBe((30_000_000 - Number(f.bovedaFee)) / 1e6);
      expect(f.pool.swap).toHaveBeenCalledWith(expect.objectContaining({ inAmount: new BN("119500000") }));
      expect(f.pool.simulateRebalancePositionWithBalancedStrategy).toHaveBeenCalledWith(expect.anything(), expect.anything(), 0, new BN("98505000"), new BN("98505000"), expect.anything(), expect.anything());
      expect(result.prepared?.wallet).toBe(f.input.wallet);
      if (!result.prepared) throw new Error("Missing verified transaction");
      const tx = VersionedTransaction.deserialize(Buffer.from(result.prepared.transaction, "base64"));
      expect(tx.serialize().length).toBeLessThanOrEqual(1232);
      expect(tx.signatures.every((s) => s.every((b) => b === 0))).toBe(true);
      expect(f.send).not.toHaveBeenCalled();
    });
    it(`${id}: compounds net harvested earnings on an upward exit`, async () => {
      const f = fixture(id, true);
      const result = await simulateDlmmRebalance(f.connection, f.input, { prepare: true, maxImpactPct: 1.5 });
      expect(result.success).toBe(true);
      expect(result.gainsKeptUsd).toBeUndefined();
      expect(Number(result.gainsAddedUsd)).toBeCloseTo((30_000_000 - Number(f.bovedaFee)) / 1e6, 2);
      expect(Number(result.valueUsd)).toBeGreaterThan(200);
      expect(f.send).not.toHaveBeenCalled();
    });
  }
  it("refuses signable bytes if the final cash balance does not retain the downward earnings", async () => {
    const f = fixture("trump", false, true);
    const result = await simulateDlmmRebalance(f.connection, f.input, { prepare: true });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(f.send).not.toHaveBeenCalled();
  });
  it("retains the 1.5% automatic swap-impact limit", async () => {
    const f = fixture("trump", false);
    vi.spyOn(f.pool, "swapQuote").mockImplementation((amount: BN) => ({ priceImpact: new BN(2), minOutAmount: amount, binArraysPubkey: [] }));
    const result = await simulateDlmmRebalance(f.connection, f.input, { prepare: true, maxImpactPct: 1.5 });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(f.pool.swap).not.toHaveBeenCalled();
  });
  it("does not harvest or compound on small moves inside the existing range", async () => {
    const f = fixture("trump", true);
    f.pool.lbPair.activeId = 0;
    const result = await simulateDlmmRebalance(f.connection, f.input, { prepare: true });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(f.pool.swap).not.toHaveBeenCalled();
  });
});