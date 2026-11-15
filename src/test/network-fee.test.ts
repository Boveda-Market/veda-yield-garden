import { describe, expect, it } from "vitest";
import { expectedNetworkFee } from "@/lib/compute-budget";

describe("network fee fallback", () => {
  it("is 5,000 lamports per signature plus the priority price on the limit", () => {
    expect(expectedNetworkFee(1, 200_000)).toBe(9_000n);
    expect(expectedNetworkFee(2, 600_000)).toBe(22_000n);
  });
});
