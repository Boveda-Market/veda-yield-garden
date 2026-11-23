import { describe, expect, it } from "vitest";
import { activationCharge, activationKind, activationShortfallMicro, gasIsLow, refillCharge, refillLamports, treasuryCanRefill } from "@/lib/gas-refill";

describe("gas refill", () => {
  it("is low below 0.003 SOL", () => { expect(gasIsLow(2_999_999n)).toBe(true); expect(gasIsLow(3_000_000n)).toBe(false); });
  it("tops up to the 0.01 SOL reserve", () => { expect(refillLamports(0n)).toBe(10_000_000n); expect(refillLamports(1_000_000n)).toBe(9_000_000n); expect(refillLamports(5_000_000n)).toBe(0n); });
  it("charges market + 5% + 0.01 USDC", () => { expect(refillCharge(2_000_000n)).toBe(2_110_000n); });
  it("charges at least 0.05 USDC", () => { expect(refillCharge(1_000n)).toBe(50_000n); });
  it("tops a regular-vault deposit up to 0.02 SOL", () => { expect(refillLamports(2_500_000n, "deposit")).toBe(17_500_000n); expect(refillLamports(20_000_000n, "deposit")).toBe(0n); });
  it("treasury sponsors only while keeping its 0.003 SOL floor", () => { expect(treasuryCanRefill(13_000_000n, 10_000_000n, 3_000_000n)).toBe(true); expect(treasuryCanRefill(20_000_000n, 38_800_000n, 3_000_000n)).toBe(false); });
});

describe("first-time activation", () => {
  it("charges reserve market value plus exactly $5", () => expect(activationCharge(8_800_000n)).toBe(13_800_000n));
  it("charges reserve market value plus exactly $2 for an additional vault", () => expect(activationCharge(8_800_000n, "extra")).toBe(10_800_000n));
  it("charges no activation fee when reopening a vault opened before (reserve refill only)", () => expect(activationCharge(8_800_000n, "reopen")).toBe(refillCharge(8_800_000n)));
  it("delivers 0.065 SOL from an empty wallet", () => expect(refillLamports(0n, "vault")).toBe(65_000_000n));
  it("asks for the missing dollars below $20", () => {
    expect(activationShortfallMicro(12_000_000n)).toBe(8_000_000n);
    expect(activationShortfallMicro(20_000_000n)).toBe(0n);
  });
});


describe("Doble o Nada activation need", () => {
  it("asks for the bet plus $15 when the account still has to be activated", async () => {
    const { playActivationNeedMicro } = await import("@/lib/gas-refill");
    expect(playActivationNeedMicro(10_000_000n)).toBe(25_000_000n);
  });
});

describe("activation kind", () => {
  const GTA6 = "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8", TRUMP = "3C5YE97HADPDxZehYq9Cis8AXr9aNyrUsczKzE1nDbW9";
  it("first vault ever pays the $5 account activation", () => expect(activationKind(false, [], GTA6)).toBe("new"));
  it("a vault opened before, closed and reopened pays no activation", () => expect(activationKind(false, [GTA6], GTA6)).toBe("reopen"));
  it("reopening still free while another vault is open", () => expect(activationKind(true, [GTA6, TRUMP], GTA6)).toBe("reopen"));
  it("a new vault for an account that already had one pays $2", () => expect(activationKind(false, [TRUMP], GTA6)).toBe("extra"));
  it("a new vault while another is open pays $2", () => expect(activationKind(true, [], GTA6)).toBe("extra"));
});
