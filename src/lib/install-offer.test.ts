import { describe, expect, it } from "vitest";
import { shouldOfferInstall } from "./install-offer";
describe("install offer", () => {
  it("shows to new browser visitors", () => expect(shouldOfferInstall({ standalone: false, seen: false, returning: false })).toBe(true));
  it("skips inside the installed app", () => expect(shouldOfferInstall({ standalone: true, seen: false, returning: false })).toBe(false));
  it("shows only once", () => expect(shouldOfferInstall({ standalone: false, seen: true, returning: false })).toBe(false));
  it("skips returning visitors", () => expect(shouldOfferInstall({ standalone: false, seen: false, returning: true })).toBe(false));
});
