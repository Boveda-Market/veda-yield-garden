import { describe, expect, it } from "vitest";
import { resolveTheme, THEME_BOOT, THEME_COLORS } from "./theme";

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
  it("paints the phone top bar dark when Night was chosen", () => {
    let color = "";
    const meta = { setAttribute(_n: string, v: string) { color = v; } };
    const run = new Function("localStorage", "document", THEME_BOOT);
    run({ getItem: () => "dark" }, {
      documentElement: { classList: { toggle() {} } },
      querySelector: () => meta,
    });
    expect(color).toBe(THEME_COLORS.dark);
    expect(THEME_COLORS.dark).not.toBe(THEME_COLORS.light);
  });
});
