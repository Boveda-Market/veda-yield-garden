import { describe, expect, it } from "vitest";
import { alertAllowed, parseMuted, toggleMuted } from "./alert-kinds";

describe("per-type Telegram alerts", () => {
  it("sends every kind by default when alerts are on", () => {
    expect(alertAllowed(true, [], "harvest")).toBe(true);
    expect(alertAllowed(true, [], "commission")).toBe(true);
  });
  it("skips a muted kind but keeps the others", () => {
    expect(alertAllowed(true, ["withdraw"], "withdraw")).toBe(false);
    expect(alertAllowed(true, ["withdraw"], "deposit")).toBe(true);
  });
  it("the master switch off blocks everything", () => {
    expect(alertAllowed(false, [], "predict")).toBe(false);
  });
  it("toggles one kind and ignores unknown stored values", () => {
    expect(toggleMuted([], "exit", false)).toEqual(["exit"]);
    expect(toggleMuted(["exit", "deposit"], "exit", true)).toEqual(["deposit"]);
    expect(parseMuted(["harvest", "bogus", 3])).toEqual(["harvest"]);
  });
});
