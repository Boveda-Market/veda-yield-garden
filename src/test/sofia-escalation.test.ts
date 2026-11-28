import { describe, expect, it } from "vitest";
import { ESCALATE_TAG, escalateAllowed, splitEscalation } from "@/lib/support-chat";

describe("Sofía escalation", () => {
  it("strips the marker and flags escalation", () => {
    expect(splitEscalation(`Ya avisé al equipo. ${ESCALATE_TAG}`)).toEqual({ text: "Ya avisé al equipo.", escalate: true });
    expect(splitEscalation("Hola").escalate).toBe(false);
  });
  it("allows at most 3 alerts per hour per caller", () => {
    const now = 10_000_000;
    expect(escalateAllowed([now - 1, now - 2], now)).toBe(true);
    expect(escalateAllowed([now - 1, now - 2, now - 3], now)).toBe(false);
    expect(escalateAllowed([now - 3_700_000, now - 1, now - 2], now)).toBe(true);
  });
});
