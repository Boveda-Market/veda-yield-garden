import { describe, expect, it } from "vitest";
import { openVaultPosition } from "@/lib/deposit-simulation";

describe("one position per vault", () => {
  const pos = (address: string, vaultId: string, locked = false) => ({ address, vaultId, locked });
  it("a deposit or move into an open vault targets that position", () => {
    expect(openVaultPosition([pos("A", "gta6"), pos("B", "btc")], "btc")).toBe("B");
  });
  it("opens a new position only when the vault is not open", () => {
    expect(openVaultPosition([pos("A", "gta6")], "btc")).toBeNull();
  });
  it("skips locked positions, which cannot take more money", () => {
    expect(openVaultPosition([pos("L", "btc", true), pos("U", "btc")], "btc")).toBe("U");
    expect(openVaultPosition([pos("L", "btc", true)], "btc")).toBeNull();
  });
});
