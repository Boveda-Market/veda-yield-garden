import { describe, expect, it } from "vitest";
import { resolvedOutcome } from "./predict-alerts";

describe("resolvedOutcome", () => {
  it("open rounds are not notified", () => expect(resolvedOutcome({ status: "open", result: null, payoutMicro: "0" })).toBeNull());
  it("a win with a prize is pending to claim", () => expect(resolvedOutcome({ status: "closed", result: "yes", isYes: true, payoutMicro: "5000000" })).toBe("won"));
  it("a win with nothing left to claim is not notified", () => expect(resolvedOutcome({ status: "closed", result: "yes", isYes: true, payoutMicro: "0" })).toBeNull());
  it("a loss is notified", () => expect(resolvedOutcome({ status: "closed", result: "yes", isYes: false, payoutMicro: "0" })).toBe("lost"));
});
