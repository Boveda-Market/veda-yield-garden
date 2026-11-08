// @vitest-environment node
import { Buffer } from "buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { CHAIN_POOLS } from "@/lib/solana-data";
const mocks = vi.hoisted(() => ({ decode: vi.fn(), signatures: vi.fn(), transaction: vi.fn() }));
vi.mock("@meteora-ag/cp-amm-sdk", async () => {
  const { PublicKey } = await import("@solana/web3.js");
  return { CP_AMM_PROGRAM_ID: new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"), cpAmmCoder: { events: { decode: mocks.decode } } };
});
vi.mock("@/lib/solana-read.server", () => ({ heliusConnection: () => ({ getSignaturesForAddress: mocks.signatures, getParsedTransaction: mocks.transaction }) }));
import { decodeMeteoraRecords, readMeteoraHistory } from "@/lib/meteora-history.server";

const wallet = CHAIN_POOLS[0].pool;
function encoded() { let n = BigInt(`0x${Buffer.from("e445a52e51cb9a1d0000000000000000", "hex").toString("hex")}`); let s = ""; const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; while (n > 0n) { s = chars[Number(n % 58n)] + s; n /= 58n; } return s; }
const tx = (err: unknown = null) => ({ slot: 42, blockTime: 10, transaction: { signatures: ["sig"] }, meta: { err, innerInstructions: [{ index: 4, instructions: [{ programId: new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"), data: encoded() }] }] } }) as unknown as ParsedTransactionWithMeta;
beforeEach(() => { vi.resetAllMocks(); mocks.decode.mockReturnValue({ name: "EvtClaimPositionFee", data: { owner: wallet, pool: CHAIN_POOLS[0].pool, position: CHAIN_POOLS[1].pool, fee_a_claimed: 339n, fee_b_claimed: 31n } }); });
describe("official Meteora event attribution", () => {
  it("decodes confirmed raw token claims for the exact owner and pool", () => { expect(decodeMeteoraRecords(tx(), wallet, "sig")[0]).toMatchObject({ kind: "harvest", tokenRaw: "339", usdcRaw: "31", at: 10000 }); });
  it("ignores failed transactions and another wallet's claims", () => { expect(decodeMeteoraRecords(tx({ error: 1 }), wallet, "sig")).toEqual([]); expect(decodeMeteoraRecords(tx(), CHAIN_POOLS[1].pool, "sig")).toEqual([]); });
  it("does not attribute a mismatched transaction signature", () => { expect(decodeMeteoraRecords(tx(), wallet, "other")).toEqual([]); });
  it("excludes unvalidated Token-2022 pool events", () => { mocks.decode.mockReturnValue({ name: "EvtClaimPositionFee", data: { owner: wallet, pool: CHAIN_POOLS[2].pool } }); expect(decodeMeteoraRecords(tx(), wallet, "sig")).toEqual([]); });
  it("distinguishes withdrawals from fee claims", () => { mocks.decode.mockReturnValue({ name: "EvtLiquidityChange", data: { owner: wallet, pool: wallet, position: wallet, change_type: 1, token_a_amount: 8988839n, token_b_amount: 168351n } }); expect(decodeMeteoraRecords(tx(), wallet, "sig")[0]).toMatchObject({ kind: "withdraw", usdcRaw: "168351" }); });
  it("bounds finalized history and counts missing transactions rather than declaring zero", async () => { mocks.signatures.mockResolvedValue([{ signature: "sig", err: null }]); mocks.transaction.mockResolvedValue(null); const result = await readMeteoraHistory("test", wallet); expect(result.missing).toBe(1); expect(mocks.signatures).toHaveBeenCalledWith(new PublicKey(wallet), { limit: 25 }, "finalized"); expect(mocks.transaction).toHaveBeenCalledWith("sig", { commitment: "finalized", maxSupportedTransactionVersion: 0 }); });
});