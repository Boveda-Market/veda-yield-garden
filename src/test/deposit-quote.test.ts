import { describe, expect, it } from "vitest";
import { depositQuote, playQuote } from "@/lib/deposit-quote";
describe("depositQuote", () => {
  it("first deposit of $20 pays $5 activation plus live reserve", () => {
    expect(depositQuote(20_000_000n, 6_420_000n, 5_000_000n)).toEqual({ amount: 20_000_000n, fee: 5_000_000n, reserve: 1_420_000n, net: 13_580_000n });
  });
  it("no activation needed: everything goes into the vault", () => {
    expect(depositQuote(20_000_000n, null, 5_000_000n).net).toBe(20_000_000n);
  });
  it("never goes below zero", () => { expect(depositQuote(3_000_000n, 6_000_000n, 5_000_000n).net).toBe(0n); });
});
describe("playQuote", () => {
  it("a $5 first play needs $5 + $5 activation + live reserve", () => {
    expect(playQuote(5_000_000n, 6_420_000n, 5_000_000n)).toEqual({ stake: 5_000_000n, fee: 5_000_000n, reserve: 1_420_000n, total: 11_420_000n });
  });
  it("active account: total is just the stake", () => { expect(playQuote(5_000_000n, null, 5_000_000n).total).toBe(5_000_000n); });
});
