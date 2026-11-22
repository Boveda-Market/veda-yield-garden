import { describe, expect, it } from "vitest";
import { isEmptyPortfolio, isExploringAccount } from "@/lib/explore-state";

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
