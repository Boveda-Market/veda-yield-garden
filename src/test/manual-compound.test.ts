import { describe, expect, it } from "vitest";
import { autopilotFailures, showManualCompound, withFailure } from "@/lib/autopilot";
describe("manual compound after Auto-Compound failures", () => {
  it("counts consecutive failures", () => { expect(autopilotFailures(withFailure(withFailure(null, "a"), "b"))).toBe(2); });
  it("resets after a confirmed rebalance", () => { expect(autopilotFailures("Rebalanceada")).toBe(0); });
  it("stays hidden after 2 failures", () => { expect(showManualCompound(2)).toBe(false); });
  it("shows after 3 failures", () => { expect(showManualCompound(3)).toBe(true); });
});
