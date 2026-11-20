import { describe, expect, it } from "vitest";
import { shouldAutoPasskey } from "@/lib/passkey-device";
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
describe("automatic fingerprint prompt", () => {
  it("asks only once per visit", () => { const s = mem(); expect(shouldAutoPasskey(s)).toBe(true); expect(shouldAutoPasskey(s)).toBe(false); });
  it("never asks right after signing out", () => { expect(shouldAutoPasskey(mem({ "boveda:just-logged-out": "1" }))).toBe(false); });
});
