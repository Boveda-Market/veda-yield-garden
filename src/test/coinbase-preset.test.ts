import { describe, expect, it } from "vitest";
import { presetBuyUsd } from "@/lib/coinbase-offramp.server";
describe("Coinbase preset amount", () => {
  it("defaults new accounts to $20 instead of $50", () => expect(presetBuyUsd()).toBe(20));
  it("uses the calculated missing amount rounded up", () => expect(presetBuyUsd(13.4)).toBe(14));
});
