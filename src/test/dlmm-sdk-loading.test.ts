// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("DLMM SDK server loading", () => {
  it("loads the concentrated-liquidity SDK with its pool factory and helpers", async () => {
    const { loadDlmmSdk } = await import("@/lib/dlmm-sdk.server");
    const sdk = await loadDlmmSdk();
    expect(typeof sdk.DLMM.create).toBe("function");
    expect(typeof sdk.wrapPosition).toBe("function");
    expect(typeof sdk.binIdToBinArrayIndex).toBe("function");
    expect(sdk.StrategyType.Spot).toBe(0);
  });
});
