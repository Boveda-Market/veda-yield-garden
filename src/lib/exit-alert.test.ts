import { describe, it, expect } from "vitest";
import { exitAlertText } from "./telegram-alerts.functions";
describe("exit telegram alert", () => {
  it("partial withdrawal never says the vault closed", () => { const t = exitAlertText(50, "125", "GTA6"); expect(t).toContain("Retiro completado (50%)"); expect(t).not.toContain("cerrada"); expect(t).toContain("$125.00"); });
  it("full withdrawal has no opening deposit line nor fees", () => { const t = exitAlertText(100, "250", "GTA6"); expect(t).toContain("Retiro total"); expect(t).not.toMatch(/Garantía|comisi/i); });
});
