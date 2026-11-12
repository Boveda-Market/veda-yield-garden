import { describe, expect, it } from "vitest";
import { overDailyLimit, suggestionInput } from "@/lib/suggestions";

describe("suggestions", () => {
  it("allows 3 per day, blocks the 4th", () => { expect(overDailyLimit(2)).toBe(false); expect(overDailyLimit(3)).toBe(true); });
  it("caps message at 500 chars", () => {
    expect(suggestionInput.safeParse({ category: "idea", message: "a".repeat(500) }).success).toBe(true);
    expect(suggestionInput.safeParse({ category: "idea", message: "a".repeat(501) }).success).toBe(false);
  });
});
