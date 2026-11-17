import { describe, expect, it } from "vitest";
import { shouldAutoRescue } from "@/components/boot-splash";

const store = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
const now = 1_000_000_000;

describe("loading-screen rescue after sign-in", () => {
  it("reloads a private screen right after a sign-in", () => {
    expect(shouldAutoRescue(now, "/wallet", "", store({ "boveda:auth-pending": String(now - 4000) }))).toBe(true);
  });
  it("never reloads the home page, where Google returns", () => {
    expect(shouldAutoRescue(now, "/", "", store({ "boveda:auth-pending": String(now - 4000) }))).toBe(false);
  });
  it("never reloads while Google sign-in parameters are in the address", () => {
    expect(shouldAutoRescue(now, "/wallet", "?privy_oauth_code=x", store({ "boveda:auth-pending": String(now - 4000) }))).toBe(false);
  });
  it("does nothing without a recent sign-in", () => {
    expect(shouldAutoRescue(now, "/wallet", "", store())).toBe(false);
  });
  it("reloads at most once per minute", () => {
    const s = store({ "boveda:auth-pending": String(now - 4000) });
    expect(shouldAutoRescue(now, "/wallet", "", s)).toBe(true);
    expect(shouldAutoRescue(now + 30_000, "/wallet", "", s)).toBe(false);
  });
});
