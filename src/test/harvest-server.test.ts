// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { Buffer } from "buffer";
import { Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CHAIN_POOLS, USDC_MINT } from "@/lib/solana-data";
import { FEE_WALLET } from "@/lib/fees";

const mocks = vi.hoisted(() => ({ owned: vi.fn(), pool: vi.fn(), before: vi.fn(), simulate: vi.fn(), claim: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/solana-read.server", () => ({ heliusConnection: () => ({ getGenesisHash: async () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", getMultipleAccountsInfo: mocks.before, getLatestBlockhash: async () => ({ blockhash: USDC_MINT }), simulateTransaction: mocks.simulate, sendRawTransaction: mocks.send }) }));
vi.mock("@meteora-ag/cp-amm-sdk/dist/index.js", () => ({ CpAmm: class { getPositionsByUser = mocks.owned; fetchPoolState = mocks.pool; claimPositionFee = mocks.claim; getWithdrawQuote = () => ({ outAmountA: 0n, outAmountB: 0n }); } }));
import { simulateHarvest } from "@/lib/harvest.server";

const owner = Keypair.generate().publicKey, nft = Keypair.generate().publicKey, position = Keypair.generate().publicKey;
const feeOwner = new PublicKey(FEE_WALLET), usdc = new PublicKey(USDC_MINT);
function tokenData(amount: bigint, mint: PublicKey, accountOwner: PublicKey) {
  const data = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({ mint, owner: accountOwner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
  return data;
}
const tokenAccount = (amount: bigint, mint: PublicKey, accountOwner: PublicKey) => ({ owner: TOKEN_PROGRAM_ID, data: tokenData(amount, mint, accountOwner), lamports: 2_000_000 });
const input = { wallet: owner.toBase58(), position: position.toBase58(), vaultId: "met" as const };
const options = { prepare: true, maximumFeeRaw: "1500000" };
beforeEach(() => {
  vi.resetAllMocks();
  const token = new PublicKey(CHAIN_POOLS[1].mint);
  mocks.owned.mockResolvedValue([{ position, positionNftAccount: Keypair.generate().publicKey, positionState: { pool: new PublicKey(CHAIN_POOLS[1].pool), nftMint: nft } }]);
  mocks.pool.mockResolvedValue({ tokenAMint: token, tokenBMint: usdc, tokenAFlag: 0, tokenBFlag: 0 });
  mocks.before.mockResolvedValue([tokenAccount(1_000n, usdc, owner), tokenAccount(200n, token, owner), tokenAccount(0n, usdc, feeOwner), { lamports: 3_000_000 }, { lamports: 20_000_000 }, { owner: TOKEN_2022_PROGRAM_ID, lamports: 2_000_000 }, { owner: TOKEN_2022_PROGRAM_ID, data: tokenData(1n, nft, owner), lamports: 2_000_000 }]);
  mocks.claim.mockResolvedValue(new Transaction().add(new TransactionInstruction({ programId: new PublicKey(CHAIN_POOLS[1].pool), keys: [{ pubkey: owner, isSigner: true, isWritable: true }], data: Buffer.from([1]) })));
  let calls = 0;
  mocks.simulate.mockImplementation(async (tx) => {
    expect(tx.signatures.every((sig: Uint8Array) => sig.every((b) => b === 0))).toBe(true);
    ++calls;
    const account = (value: bigint, mint: PublicKey, accountOwner: PublicKey) => ({ owner: TOKEN_PROGRAM_ID.toBase58(), data: [tokenData(value, mint, accountOwner).toString("base64"), "base64"], lamports: 2_000_000 });
    return { value: { err: null, accounts: [account(50_001_000n, usdc, owner), account(500n, token, owner), account(0n, usdc, feeOwner), { lamports: 3_000_000 }, { lamports: 20_000_000 }, { lamports: 2_000_000 }, { lamports: 2_000_000 }] } };
  });
});
it("prepares a new owner MET harvest, with no fee: the full 50 USDC harvest reaches the owner and preserving old balances", async () => {
  const result = await simulateHarvest("test", input, options);
  expect(result.success).toBe(true);
  expect(result.prepared?.wallet).toBe(input.wallet);
  expect(result.prepared?.position).toBe(input.position);
  expect(result.feeRaw).toBe("0");
  expect(result.net).toBe("50");
  expect(result.tokenAmount).toBe("0.0003");
  expect(mocks.send).not.toHaveBeenCalled();
});
it("prepares SOL harvests beyond the original pilot", async () => {
  const rows = await mocks.owned();
  rows[0].positionState.pool = new PublicKey(CHAIN_POOLS[0].pool);
  mocks.owned.mockResolvedValue(rows);
  const pool = await mocks.pool();
  pool.tokenAMint = new PublicKey(CHAIN_POOLS[0].mint);
  mocks.pool.mockResolvedValue(pool);
  const before = await mocks.before();
  before[1] = tokenAccount(200n, pool.tokenAMint, owner);
  mocks.before.mockResolvedValue(before);
  const original = mocks.simulate.getMockImplementation();
  mocks.simulate.mockImplementation(async (tx) => {
    const response = await original?.(tx);
    if (!response) throw new Error("Missing fixture");
    response.value.accounts[1].data = [tokenData(500n, pool.tokenAMint, owner).toString("base64"), "base64"];
    return response;
  });
  const result = await simulateHarvest("test", { ...input, vaultId: "sol" }, options);
  expect(result.success).toBe(true);
  expect(result.tokenAmount).toBe("0.0000003");
});
it("rejects a position outside the owner's NFT discovery", async () => {
  mocks.owned.mockResolvedValue([]);
  expect((await simulateHarvest("test", input, options)).prepared).toBeUndefined();
  expect(mocks.claim).not.toHaveBeenCalled();
});
it("rejects a mismatched NFT owner", async () => {
  const before = await mocks.before();
  before[6].data = tokenData(1n, nft, feeOwner);
  mocks.before.mockResolvedValue(before);
  expect((await simulateHarvest("test", input, options)).prepared).toBeUndefined();
  expect(mocks.claim).not.toHaveBeenCalled();
});
it("rejects a position in the wrong pool", async () => {
  expect((await simulateHarvest("test", { ...input, vaultId: "sol" }, options)).prepared).toBeUndefined();
  expect(mocks.claim).not.toHaveBeenCalled();
});
it("never returns signable bytes after a rejected simulation", async () => {
  mocks.simulate.mockResolvedValue({ value: { err: "failed", accounts: null } });
  expect((await simulateHarvest("test", input, options)).prepared).toBeUndefined();
  expect(mocks.send).not.toHaveBeenCalled();
});