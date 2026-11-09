// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("deposit SDK native server loading", () => {
  it("loads the real CommonJS SDK without Anchor named-export failures", async () => {
    const sdk = await import("@meteora-ag/cp-amm-sdk/dist/index.js");
    expect(typeof sdk.CpAmm).toBe("function");
    expect(typeof sdk.cpAmmCoder.accounts.decode).toBe("function");
    expect(typeof sdk.derivePositionAddress).toBe("function");
  });
});