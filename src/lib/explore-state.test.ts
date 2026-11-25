import { describe, expect, it } from "vitest";
import { hasOwnFunds, isEmptyPortfolio, isExploringAccount } from "@/lib/explore-state";

describe("Explorar primero (cuentas nuevas en $0)", () => {
  it("Billetera: $0 and no vaults explores first", () => {
    expect(isExploringAccount(0n, 0, false)).toBe(true);
  });
  it("Billetera: any dollars keep the normal layout", () => {
    expect(isExploringAccount(1n, 0, false)).toBe(false);
  });
  it("Billetera: an open vault keeps the normal layout", () => {
    expect(isExploringAccount(0n, 1, false)).toBe(false);
  });
  it("Billetera: waits for vaults to load before deciding", () => {
    expect(isExploringAccount(0n, 0, true)).toBe(false);
  });
  it("Portafolio: no dollars, reserve or vaults hides the $0 chart", () => {
    expect(isEmptyPortfolio("0", "0", 0)).toBe(true);
  });
  it("Portafolio: dollars in the account keep the chart", () => {
    expect(isEmptyPortfolio("5.25", "0", 0)).toBe(false);
  });
  it("Portafolio: a vault keeps the chart even at $0 cash", () => {
    expect(isEmptyPortfolio("0", "0", 1)).toBe(false);
  });
});

describe("hasOwnFunds", () => {
  it("own SOL above 0.01 counts as brought funds", () => { expect(hasOwnFunds(20_000_000n)).toBe(true); expect(hasOwnFunds(10_000_000n)).toBe(false); });
  it("any other coin counts", () => expect(hasOwnFunds(0n, { cbBTC: 5n })).toBe(true));
  it("empty wallet keeps the new-user guides", () => expect(hasOwnFunds(0n, { USDC: 0n, TRUMP: 0n })).toBe(false));
});
