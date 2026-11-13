import { describe, it, expect } from "vitest";
import { decide } from "./status-monitor";
const base = { service: "vaults", first_down_at: null, operator_alerted: false, public_alerted: false };
const t0 = Date.parse("2026-11-13T00:00:00Z");
describe("downtime alerts", () => {
  it("alerts operator immediately but not public", () => { const a = decide(base, true, t0); expect(a.operatorDown).toBe(true); expect(a.publicDown).toBe(false); });
  it("alerts public after 3 minutes down", () => { const a = decide({ ...base, first_down_at: new Date(t0).toISOString(), operator_alerted: true }, true, t0 + 180_000); expect(a.publicDown).toBe(true); expect(a.operatorDown).toBe(false); });
  it("does not alert public before 3 minutes", () => { expect(decide({ ...base, first_down_at: new Date(t0).toISOString(), operator_alerted: true }, true, t0 + 120_000).publicDown).toBe(false); });
  it("posts recovery only if public was alerted", () => { expect(decide({ ...base, operator_alerted: true, public_alerted: true }, false, t0).publicUp).toBe(true); expect(decide({ ...base, operator_alerted: true }, false, t0).publicUp).toBe(false); });
});
