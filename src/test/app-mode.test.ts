import { describe, expect, it } from "vitest";
import { canRunTrial, canUseTrial, REAL_OPERATIONS_AVAILABLE } from "@/lib/app-mode";
import { demoSessionKey, readDemoSession } from "@/lib/demo-session";

describe("Real and Prueba boundaries", () => {
  it("allows anyone to use Prueba as an explicit guest without registration", () => {
    expect(canUseTrial("trial", false, null, true)).toBe(true);
    expect(canUseTrial("trial", false, null, false)).toBe(false);
  });
  it("never grants guest Real access or trial actions in Real", () => {
    expect(canUseTrial("real", false, null, true)).toBe(false);
    expect(canUseTrial("real", true, "did:privy:alice", true)).toBe(false);
  });
  it("gives a new trial exactly 1000 fictitious credits", () => {
    expect(readDemoSession(null)).toEqual({ wallet: 1000, positions: [] });
  });
  it("never allows a Real selection to execute trial accounting", () => {
    expect(canRunTrial("real", true, "did:privy:alice")).toBe(false);
    expect(canRunTrial("trial", true, "did:privy:alice")).toBe(true);
  });
  it("requires a verified session and user ID to execute trial actions", () => {
    expect(canRunTrial("trial", false, "did:privy:alice")).toBe(false);
    expect(canRunTrial("trial", true, null)).toBe(false);
  });
  it("keeps each user's trial separate", () => {
    expect(demoSessionKey("did:privy:alice")).not.toBe(demoSessionKey("did:privy:bob"));
  });
  it("enables compatible Real operations without granting guests Real access", () => {
    expect(REAL_OPERATIONS_AVAILABLE).toBe(true);
    expect(canUseTrial("real", false, null, true)).toBe(false);
  });
});