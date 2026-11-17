import { describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";
import { decodeDlmmRecords } from "@/lib/meteora-history.server";

const POOL = "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8", OWNER = PublicKey.unique().toBase58(), POS = PublicKey.unique().toBase58();
const ev = (tag: string, x: bigint, y: bigint, rebal = false) => {
  const head = Buffer.from("e445a52e51cb9a1d" + tag, "hex");
  const keys = Buffer.concat([POOL, POS, OWNER].map((k) => Buffer.from(new PublicKey(k).toBytes())));
  const body = Buffer.alloc(rebal ? 100 : 20); // rebal: i32 + 4×u64 before fees; claim: fees then i32
  const fees = Buffer.alloc(16); fees.writeBigUInt64LE(x, 0); fees.writeBigUInt64LE(y, 8);
  return Buffer.concat(rebal ? [head, keys, body.subarray(0, 36), fees, Buffer.alloc(80)] : [head, keys, fees, Buffer.alloc(4)]);
};
const meta = { signature: "s", at: 1, slot: 1 };

describe("GTA6 vault history", () => {
  it("counts one harvest when a claim emits both claim events", () => {
    const r = decodeDlmmRecords([{ id: "a", data: ev("4b7a9a308c4a7ba3", 502n, 8_110_924n) }, { id: "b", data: ev("e8abf2613a4d232d", 502n, 8_110_924n) }], OWNER, meta);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "harvest", usdcRaw: "8110924", tokenRaw: "502", pool: POOL });
  });
  it("counts fees collected inside a rebalance as a harvest", () => {
    const r = decodeDlmmRecords([{ id: "c", data: ev("006d75b33d5bc7c8", 7n, 3_000_000n, true) }], OWNER, meta);
    expect(r[0]).toMatchObject({ kind: "harvest", usdcRaw: "3000000", tokenRaw: "7" });
  });
  it("ignores other wallets", () => expect(decodeDlmmRecords([{ id: "a", data: ev("e8abf2613a4d232d", 1n, 1n) }], PublicKey.unique().toBase58(), meta)).toHaveLength(0));
});
