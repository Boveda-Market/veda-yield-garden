// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { AccountLayout, ExtensionType, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { transferToken } from "@/lib/wallet-actions";

const mocks = vi.hoisted(() => ({ mint: vi.fn(), account: vi.fn(), extensions: vi.fn(), simulation: vi.fn() }));
vi.mock("@solana/spl-token", async (original) => ({ ...await original<typeof import("@solana/spl-token")>(), getMint: mocks.mint, getAccount: mocks.account, getExtensionTypes: mocks.extensions }));
vi.mock("@/lib/helius.server", () => ({ heliusConnection: () => ({
  getAccountInfo: async () => null, getBalance: async () => 100_000_000,
  getLatestBlockhash: async () => ({ blockhash: "11111111111111111111111111111111" }), simulateTransaction: mocks.simulation,
}) }));
import { prepareCheckedTokenTransfer } from "@/lib/token-transfer.server";

const from = "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to = "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR";
const asset = transferToken("DCTY");
function encoded(owner: string, amount: bigint) {
  const buffer = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({ mint: new PublicKey(asset.mint), owner: new PublicKey(owner), amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, buffer);
  return { owner: TOKEN_2022_PROGRAM_ID.toBase58(), data: [buffer.toString("base64"), "base64"], lamports: 2_039_280 };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mint.mockResolvedValue({ decimals: 6, isInitialized: true, freezeAuthority: null, tlvData: Buffer.alloc(0) });
  mocks.extensions.mockReturnValue([ExtensionType.MetadataPointer]);
  mocks.account.mockResolvedValue({ owner: new PublicKey(from), mint: new PublicKey(asset.mint), amount: 10_000_000n, isFrozen: false });
  mocks.simulation.mockResolvedValueOnce({ value: { err: null, unitsConsumed: 20_000 } }).mockResolvedValueOnce({ value: { err: null, accounts: [encoded(from, 9_750_000n), encoded(to, 250_000n), { lamports: 97_000_000 }] } });
});
it("builds an unsigned exact DCTY send after checking its program and both simulated token deltas", async () => {
  const bytes = await prepareCheckedTokenTransfer("test", { from, to, amount: "250000" }, asset);
  expect(bytes.length).toBeLessThanOrEqual(1232);
  expect(mocks.mint.mock.calls[0]?.[3]).toEqual(TOKEN_2022_PROGRAM_ID);
  expect(mocks.simulation).toHaveBeenCalledTimes(2);
});
it("rejects transfer-changing Token-2022 extensions", async () => {
  mocks.extensions.mockReturnValue([ExtensionType.TransferFeeConfig]);
  await expect(prepareCheckedTokenTransfer("test", { from, to, amount: "250000" }, asset)).rejects.toThrow("unsafe extensions");
  expect(mocks.simulation).not.toHaveBeenCalled();
});
it("rejects a simulation that does not deliver the exact requested amount", async () => {
  mocks.simulation.mockReset().mockResolvedValueOnce({ value: { err: null, unitsConsumed: 20_000 } }).mockResolvedValueOnce({ value: { err: null, accounts: [encoded(from, 9_750_000n), encoded(to, 249_999n), { lamports: 97_000_000 }] } });
  await expect(prepareCheckedTokenTransfer("test", { from, to, amount: "250000" }, asset)).rejects.toThrow("balance mismatch");
});
it("rejects any transfer that spends the retained operations reserve", async () => {
  mocks.simulation.mockReset().mockResolvedValueOnce({ value: { err: null, unitsConsumed: 20_000 } }).mockResolvedValueOnce({ value: { err: null, accounts: [encoded(from, 9_750_000n), encoded(to, 250_000n), { lamports: 9_999_999 }] } });
  await expect(prepareCheckedTokenTransfer("test", { from, to, amount: "250000" }, asset)).rejects.toThrow("reserve insufficient");
});
it("rejects incorrect mint decimals before building", async () => {
  mocks.mint.mockResolvedValue({ decimals: 9, isInitialized: true });
  await expect(prepareCheckedTokenTransfer("test", { from, to, amount: "250000" }, { ...asset, token2022: false })).rejects.toThrow("mint mismatch");
  expect(mocks.mint.mock.calls[0]?.[3]).toEqual(TOKEN_PROGRAM_ID);
});