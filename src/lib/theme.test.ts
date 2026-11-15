import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_BOOT } from "./theme";

describe("theme preference", () => {
  it("defaults every new user to Day", () => {
    expect(resolveTheme(null)).toBe("light");
    expect(resolveTheme("invalid")).toBe("light");
  });
  it("preserves an explicitly chosen Night mode", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });
  it("uses Day before paint even if storage is unavailable", () => {
    let light = false;
    const run = new Function("localStorage", "document", THEME_BOOT);
    run({ getItem() { throw new Error("blocked"); } }, {
      documentElement: { classList: { toggle(_name: string, value: boolean) { light = value; } } },
    });
    expect(light).toBe(true);
  });
});