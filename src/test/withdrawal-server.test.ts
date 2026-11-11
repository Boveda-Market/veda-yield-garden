// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import BN from "bn.js";
import { Buffer } from "buffer";
import { Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";

// Plumbing tests: exits here stay fee-free; the flat 1% rule itself is covered in withdrawal/fees tests.
vi.mock("@/lib/fees", async (orig) => ({ ...(await orig<typeof import("@/lib/fees")>()), progressiveFee: () => 0n }));
const mocks = vi.hoisted(() => ({ genesis: vi.fn(), owned: vi.fn(), pool: vi.fn(), before: vi.fn(), simulate: vi.fn(), remove: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/solana-read.server", () => ({ heliusConnection: () => ({ getGenesisHash: mocks.genesis, getMultipleAccountsInfo: mocks.before, getLatestBlockhash: async () => ({ blockhash: USDC_MINT }), getFeeForMessage: async () => ({ value: 0 }), simulateTransaction: mocks.simulate, sendRawTransaction: mocks.send }) }));
vi.mock("@meteora-ag/cp-amm-sdk/dist/index.js", () => ({ getCurrentPoint: async () => new BN(1), CpAmm: class { getPositionsByUser = mocks.owned; fetchPoolState = mocks.pool; removeAllLiquidityAndClosePosition = mocks.remove; getWithdrawQuote = () => ({ outAmountA: new BN(100), outAmountB: new BN(1_000_000) }); } }));
import { simulateWithdrawal } from "@/lib/withdrawal.server";

describe("full-close withdrawal simulation", () => {
  const wallet = Keypair.generate().publicKey.toBase58(), position = CHAIN_POOLS[1].pool;
  const usdc = new PublicKey(USDC_MINT), owner = new PublicKey(wallet);
  const tokenData = (amount: bigint, accountOwner: PublicKey) => {
    const data = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode({ mint: usdc, owner: accountOwner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
    return data;
  };
  const nftAccount = (nft: string, accountOwner: PublicKey) => {
    const data = tokenData(1n, accountOwner);
    new PublicKey(nft).toBuffer().copy(data, 0);
    return { owner: TOKEN_2022_PROGRAM_ID, data, lamports: 2_000_000 };
  };
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.genesis.mockResolvedValue("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
    mocks.owned.mockResolvedValue([{ position: new PublicKey(position), positionNftAccount: new PublicKey(CHAIN_POOLS[2].pool), positionState: { pool: new PublicKey(CHAIN_POOLS[1].pool), nftMint: new PublicKey(CHAIN_POOLS[2].mint), unlockedLiquidity: new BN(100), vestedLiquidity: new BN(0), permanentLockedLiquidity: new BN(0) } }]);
    mocks.pool.mockResolvedValue({ tokenAMint: new PublicKey(CHAIN_POOLS[1].mint), tokenBMint: usdc, tokenAFlag: 0, tokenBFlag: 0, rewardInfos: [], sqrtPrice: new BN(1), sqrtMinPrice: new BN(1), sqrtMaxPrice: new BN(2), collectFeeMode: 0, tokenAAmount: new BN(0), tokenBAmount: new BN(1_000_000), liquidity: new BN(100) });
    mocks.remove.mockResolvedValue(new Transaction().add(new TransactionInstruction({ programId: new PublicKey(CHAIN_POOLS[1].pool), keys: [{ pubkey: owner, isSigner: true, isWritable: true }], data: Buffer.from([1]) })));
    mocks.before.mockResolvedValue([{ owner: TOKEN_PROGRAM_ID, data: tokenData(0n, owner), lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID, data: tokenData(0n, new PublicKey(FEE_WALLET)), lamports: 2_000_000 }, { lamports: 3_000_000 }, { owner: TOKEN_2022_PROGRAM_ID, lamports: 2_000_000 }, nftAccount(CHAIN_POOLS[2].mint, owner), { lamports: 20_000_000 }]);
    let call = 0;
    mocks.simulate.mockImplementation(async () => {
      const final = ++call >= 3;
      return { value: { err: null, accounts: [{ owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(final ? 1_000_000n : 1_000_000n, owner).toString("base64"), "base64"], lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(0n, new PublicKey(FEE_WALLET)).toString("base64"), "base64"], lamports: 2_000_000 }, null, null, null, { lamports: 27_000_000 }] } };
    });
  });
  it("checks net USDC, zero fee under 10 USDC and all three NFT rent closures without signing or sending", async () => {
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" });
    expect(result.success).toBe(true);
    expect(result.checks).toEqual({ closed: true, usdc: true, fee: true, rent: true });
    expect(result.net).toBe("1");
    expect(result.minimumGross).toBe("0.995");
    expect(result.fee).toBe("0");
    expect(result.rentSol).toBe("0.007");
    expect(result).not.toHaveProperty("transaction");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects a position that is not owned by the requested wallet", async () => {
    mocks.owned.mockResolvedValue([]);
    expect((await simulateWithdrawal("test", { wallet, position, vaultId: "met" })).success).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects a mismatched position NFT owner before preparation", async () => {
    const accounts = await mocks.before();
    accounts[5] = nftAccount(CHAIN_POOLS[2].mint, new PublicKey(FEE_WALLET));
    mocks.before.mockResolvedValue(accounts);
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" }, { prepare: true, maximumFeeRaw: "0", minimumNetRaw: "995000" });
    expect(result.prepared).toBeUndefined();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects locked liquidity before constructing any removal", async () => {
    const rows = await mocks.owned();
    rows[0].positionState.permanentLockedLiquidity = new BN(1);
    mocks.owned.mockResolvedValue(rows);
    expect((await simulateWithdrawal("test", { wallet, position, vaultId: "met" })).success).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not validate a failed atomic simulation or expose provider errors", async () => {
    mocks.simulate.mockRejectedValue(new Error("private RPC failure"));
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" });
    expect(result.success).toBe(false);
    expect(result.message).not.toContain("private RPC failure");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not claim rent recovery when the wallet did not receive it", async () => {
    mocks.before.mockResolvedValueOnce([{ owner: TOKEN_PROGRAM_ID, data: tokenData(0n, owner), lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID, data: tokenData(0n, new PublicKey(FEE_WALLET)), lamports: 2_000_000 }, { lamports: 4_000_000 }, { owner: TOKEN_2022_PROGRAM_ID, lamports: 2_000_000 }, nftAccount(CHAIN_POOLS[2].mint, owner), { lamports: 20_000_000 }]);
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" });
    expect(result.success).toBe(false);
    expect(result.checks?.rent).toBe(false);
  });
  it("returns upside to the user without changing the fee on the protected minimum", async () => {
    let call = 0;
    mocks.simulate.mockImplementation(async () => {
      const final = ++call >= 3;
      return { value: { err: null, accounts: [{ owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(final ? 1_020_000n : 1_000_000n, owner).toString("base64"), "base64"], lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(0n, new PublicKey(FEE_WALLET)).toString("base64"), "base64"], lamports: 2_000_000 }, null, null, null, { lamports: 27_000_000 }] } };
    });
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" });
    expect(result.success).toBe(true);
    expect(result.checks?.fee).toBe(true);
    expect(result.net).toBe("1.02");
    expect(result.gross).toBe("1.02");
    expect(result.fee).toBe("0");
    expect(result.expectedFee).toBe("0");
    expect(result).not.toHaveProperty("transaction");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("preserves Jupiter route labels and percentages when rebuilding withdrawal instructions", async () => {
    const token = new PublicKey(CHAIN_POOLS[1].mint);
    const tokenAccount = (value: bigint) => {
      const data = tokenData(value, owner);
      token.toBuffer().copy(data, 0);
      return { owner: TOKEN_PROGRAM_ID.toBase58(), data: [data.toString("base64"), "base64"], lamports: 2_000_000 };
    };
    const original = mocks.simulate.getMockImplementation();
    let count = 0;
    mocks.simulate.mockImplementation(async () => {
      const response = await original?.();
      if (!response) throw new Error("Missing fixture");
      response.value.accounts[1] = tokenAccount(++count === 1 ? 100n : 0n);
      response.value.accounts[6].lamports -= 2_000_000;
      return response;
    });
    const route = { swapInfo: { ammKey: CHAIN_POOLS[2].pool, label: "Raydium", inputMint: token.toBase58(), outputMint: USDC_MINT, inAmount: "100", outAmount: "500000", feeAmount: "1", feeMint: token.toBase58() }, percent: 100, bps: 10000 };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ inputMint: token.toBase58(), outputMint: USDC_MINT, inAmount: "99", otherAmountThreshold: "490000", swapMode: "ExactIn", routePlan: [route] }))).mockResolvedValueOnce(new Response(JSON.stringify({ setupInstructions: [], swapInstruction: { programId: CHAIN_POOLS[2].pool, accounts: [], data: "AQ==" }, addressLookupTableAddresses: [] })));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await simulateWithdrawal("test", { wallet, position, vaultId: "met" });
      const body = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body ?? "{}");
      expect(body.quoteResponse.routePlan).toEqual([route]);
      expect(mocks.send).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it("never prepares bytes for an unowned position", async () => {
    mocks.owned.mockResolvedValue([]);
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" }, { prepare: true, maximumFeeRaw: "10000", minimumNetRaw: "980000" });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("prepares new owned MET positions beyond the original pilot", async () => {
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" }, { prepare: true, maximumFeeRaw: "0", minimumNetRaw: "995000" });
    expect(result.success).toBe(true);
    expect(result.prepared?.wallet).toBe(wallet);
    expect(result.prepared?.position).toBe(position);
    expect(result.prepared?.transaction).toBeTruthy();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects a minimum more than 1% worse than reviewed for new positions", async () => {
    const result = await simulateWithdrawal("test", { wallet, position, vaultId: "met" }, { prepare: true, maximumFeeRaw: "0", minimumNetRaw: "1100000" });
    expect(result.success).toBe(false);
    expect(result.prepared).toBeUndefined();
  });
  it("returns only the simulated unsigned message for the exact pilot owner and NFT", async () => {
    const pilotOwner = new PublicKey(WITHDRAWAL_PILOT.wallet);
    mocks.owned.mockResolvedValue([{ position: new PublicKey(WITHDRAWAL_PILOT.position), positionNftAccount: new PublicKey(CHAIN_POOLS[2].pool), positionState: { pool: new PublicKey(CHAIN_POOLS[0].pool), nftMint: new PublicKey(WITHDRAWAL_PILOT.nft), unlockedLiquidity: new BN(100), vestedLiquidity: new BN(0), permanentLockedLiquidity: new BN(0) } }]);
    const pool = await mocks.pool();
    mocks.pool.mockResolvedValue({ ...pool, tokenAMint: new PublicKey(CHAIN_POOLS[0].mint) });
    mocks.before.mockResolvedValue([{ owner: TOKEN_PROGRAM_ID, data: tokenData(0n, pilotOwner), lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID, data: tokenData(0n, new PublicKey(FEE_WALLET)), lamports: 2_000_000 }, { lamports: 3_000_000 }, { owner: TOKEN_2022_PROGRAM_ID, lamports: 2_000_000 }, nftAccount(WITHDRAWAL_PILOT.nft, pilotOwner), { lamports: 20_000_000 }]);
    let count = 0;
    mocks.simulate.mockImplementation(async (transaction) => {
      expect(transaction.signatures.every((sig: Uint8Array) => sig.every((byte) => byte === 0))).toBe(true);
      const final = ++count >= 3;
      return { value: { err: null, accounts: [{ owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(final ? 1_000_000n : 1_000_000n, pilotOwner).toString("base64"), "base64"], lamports: 2_000_000 }, null, { owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(0n, new PublicKey(FEE_WALLET)).toString("base64"), "base64"], lamports: 2_000_000 }, null, null, null, { lamports: 27_000_000 }] } };
    });
    const result = await simulateWithdrawal("test", WITHDRAWAL_PILOT, { prepare: true, maximumFeeRaw: "0", minimumNetRaw: "995000" });
    expect(result.success).toBe(true);
    expect(result.prepared?.wallet).toBe(WITHDRAWAL_PILOT.wallet);
    expect(result.prepared?.transaction).toBeTruthy();
    expect(mocks.send).not.toHaveBeenCalled();
    const worse = await simulateWithdrawal("test", WITHDRAWAL_PILOT, { prepare: true, maximumFeeRaw: "0", minimumNetRaw: "1100000" });
    expect(worse.success).toBe(false);
    expect(worse.prepared).toBeUndefined();
  });
});