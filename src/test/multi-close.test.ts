import { describe, expect, it } from "vitest";
import { sumUsd } from "@/lib/multi-close";
describe("sumUsd", () => {
  it("adds vault payouts in cents", () => { expect(sumUsd(["210.00", "142.50", "95.00"])).toBe("447.50"); });
  it("handles thousands and skips missing", () => { expect(sumUsd(["1,000.10", undefined, "0.05"])).toBe("1,000.15"); });
});
