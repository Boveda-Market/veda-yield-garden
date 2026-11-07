import { describe, expect, it } from "vitest";
import { demoSessionKey, readDemoSession } from "@/lib/demo-session";

describe("authenticated demo balances", () => {
  it("isolates demo storage by authenticated Privy identity", () => {
    expect(demoSessionKey("did:privy:alice")).not.toBe(demoSessionKey("did:privy:bob"));
  });
  it("starts a new demo at 1000 fictitious USDC", () => {
    expect(readDemoSession(null)).toEqual({ wallet: 1000, positions: [] });
  });
  it("rejects malformed or negative stored balances", () => {
    expect(readDemoSession("{broken").wallet).toBe(1000);
    expect(readDemoSession(JSON.stringify({ wallet: -1, positions: [] })).wallet).toBe(1000);
  });
  it("restores a valid account balance without adding another credit", () => {
    expect(readDemoSession(JSON.stringify({ wallet: 0, positions: [] })).wallet).toBe(0);
  });
});