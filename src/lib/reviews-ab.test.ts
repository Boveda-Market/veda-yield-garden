import { describe, expect, it } from "vitest";
import { pickReviewsArm } from "./reviews-ab";
describe("reviews A/B", () => {
  it("splits new visitors 50/50", () => { expect(pickReviewsArm(null, null, 0.49)).toBe(true); expect(pickReviewsArm(null, null, 0.5)).toBe(false); });
  it("remembers the saved arm", () => { expect(pickReviewsArm(null, "0", 0.1)).toBe(false); });
  it("link forces an arm", () => { expect(pickReviewsArm("0", "1", 0.1)).toBe(false); expect(pickReviewsArm("1", "0", 0.9)).toBe(true); });
});
