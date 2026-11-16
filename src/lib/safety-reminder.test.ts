import { describe, expect, it } from "vitest";
import { shouldShowSafety } from "./safety-reminder";

describe("safety reminder", () => {
  it("shows on the first visit", () => expect(shouldShowSafety(1)).toBe(true));
  it("does not show on visits 2 to 10", () => { for (let v = 2; v <= 10; v++) expect(shouldShowSafety(v)).toBe(false); });
  it("shows again every 10 visits", () => { expect(shouldShowSafety(11)).toBe(true); expect(shouldShowSafety(21)).toBe(true); expect(shouldShowSafety(20)).toBe(false); });
});
