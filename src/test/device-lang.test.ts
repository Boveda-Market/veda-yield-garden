import { describe, it, expect } from "vitest";
import { detectDeviceLang } from "@/lib/i18n";
describe("device language", () => {
  it("English phone opens in English", () => expect(detectDeviceLang(["en-US"])).toBe("en"));
  it("Spanish phone opens in Spanish", () => expect(detectDeviceLang(["es-PR", "en-US"])).toBe("es"));
  it("other languages fall back to Spanish", () => expect(detectDeviceLang(["fr-FR"])).toBe("es"));
});
