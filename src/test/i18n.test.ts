import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

describe("translate", () => {
  it("keeps Spanish as the source language", () => {
    expect(translate("es", "Idioma")).toBe("Idioma");
  });
  it("returns English when a translation exists", () => {
    expect(translate("en", "Idioma")).toBe("Language");
  });
  it("falls back to Spanish and fills placeholders", () => {
    expect(translate("en", "Texto sin traducir {n}", { n: 3 })).toBe("Texto sin traducir 3");
  });
});
