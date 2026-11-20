import { describe, expect, it } from "vitest";
import { p256 } from "@noble/curves/nist.js";
import { autopilotDecision, autopilotDoneText, autopilotNotice, onlyAllowedPrograms, shouldAutoEnableAutopilot, AUTOPILOT_PROGRAMS } from "@/lib/autopilot";
import { authorizationSignature, autopilotPrivateKey, canonicalJson } from "@/lib/privy-signer";

const now = Date.parse("2026-11-16T12:00:00Z");
const ago = (min: number) => new Date(now - min * 60_000).toISOString();
const row = (p: Partial<{ enabled: boolean; last_attempt_at: string | null; last_rebalance_at: string | null }> = {}) => ({ enabled: true, last_attempt_at: null, last_rebalance_at: null, ...p });

describe("Autopilot rules", () => {
  it("does nothing when turned off", () => expect(autopilotDecision(row({ enabled: false }), ago(60), now)).toBe("off"));
  it("waits until the position has been out of range for 5 minutes", () => {
    expect(autopilotDecision(row(), ago(4), now)).toBe("waiting");
    expect(autopilotDecision(row(), ago(5), now)).toBe("due");
  });
  it("has no cooldown after a rebalance and retries a failed attempt after 5 minutes", () => {
    expect(autopilotDecision(row({ last_rebalance_at: ago(10) }), ago(30), now)).toBe("due");
    expect(autopilotDecision(row({ last_attempt_at: ago(4) }), ago(30), now)).toBe("retry");
    expect(autopilotDecision(row({ last_attempt_at: ago(5) }), ago(30), now)).toBe("due");
  });
  it("refuses any transaction that calls a program outside the rebalance allowlist", () => {
    expect(onlyAllowedPrograms(["ComputeBudget111111111111111111111111111111", "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"], AUTOPILOT_PROGRAMS)).toBe(true);
    expect(onlyAllowedPrograms(["LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", "11111111111111111111111111111111"], AUTOPILOT_PROGRAMS)).toBe(false);
    expect(onlyAllowedPrograms(["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"], AUTOPILOT_PROGRAMS)).toBe(false);
    expect(onlyAllowedPrograms([], AUTOPILOT_PROGRAMS)).toBe(false);
  });
});

describe("Privy request signing", () => {
  it("canonicalizes with sorted keys", () => expect(canonicalJson({ b: 1, a: { d: [true, null], c: "x" } })).toBe('{"a":{"c":"x","d":[true,null]},"b":1}'));
  it("produces a P-256 signature that verifies over the canonical payload", () => {
    const seed = "test-seed-not-a-secret";
    const url = "https://api.privy.io/v1/wallets/w1/rpc", body = { method: "signTransaction", params: { transaction: "AA==", encoding: "base64" } };
    const sig = Uint8Array.from(atob(authorizationSignature(seed, url, body)), (c) => c.charCodeAt(0));
    const payload = new TextEncoder().encode(canonicalJson({ version: 1, method: "POST", url, body, headers: { "privy-app-id": "cmw6ftcf900ge0hl0jyw3rc75" } }));
    expect(p256.verify(sig, payload, p256.getPublicKey(autopilotPrivateKey(seed)), { format: "der" })).toBe(true);
  });
});

describe("Autopilot default for range vaults", () => {
  it("turns on by default for a range position with no recorded choice", () => expect(shouldAutoEnableAutopilot({ hasRangePosition: true, enabled: false })).toBe(true));
  it("leaves an already-active wallet alone", () => expect(shouldAutoEnableAutopilot({ hasRangePosition: true, enabled: true })).toBe(false));
  it("does nothing without a range position or before the status loads", () => {
    expect(shouldAutoEnableAutopilot({ hasRangePosition: false, enabled: false })).toBe(false);
    expect(shouldAutoEnableAutopilot({ hasRangePosition: true, enabled: null })).toBe(false);
  });
  it("bell tells the latest event: rebalance before activation, only within 7 days", () => {
    expect(autopilotNotice({ enabled: true, enabledAt: ago(60), lastRebalanceAt: ago(5) }, now)?.kind).toBe("rebalanced");
    expect(autopilotNotice({ enabled: true, enabledAt: ago(60), lastRebalanceAt: null }, now)).toBeNull();
    expect(autopilotNotice({ enabled: true, enabledAt: ago(8 * 1440), lastRebalanceAt: null }, now)).toBeNull();
    expect(autopilotNotice({ enabled: false, enabledAt: null, lastRebalanceAt: null }, now)).toBeNull();
  });
});

describe("Autopilot rebalance notice explains the harvested earnings", () => {
  it("quotes the exact amount from $0.50 up (Telegram and bell)", () => {
    const text = autopilotDoneText("Bóveda GTA6", "250.00", 8.45);
    expect(text).toContain("+$8.45");
    expect(text).toContain("empieza desde cero");
    expect(autopilotNotice({ enabled: true, enabledAt: null, lastRebalanceAt: ago(5), lastGainsUsd: 0.5 }, now)?.gainsUsd).toBe(0.5);
  });
  it("uses the short reassuring message for cents or unknown amounts", () => {
    for (const g of [0.49, 0, null, undefined]) {
      const text = autopilotDoneText("Bóveda GTA6", "250.00", g);
      expect(text).toContain("No tienes que hacer ninguna acción");
      expect(text).not.toContain("+$");
    }
    expect(autopilotNotice({ enabled: true, enabledAt: null, lastRebalanceAt: ago(5), lastGainsUsd: 0.2 }, now)?.gainsUsd).toBeNull();
  });
});

describe("Autopilot notice names the vault", () => {
  it("title and breakdown include the vault name and active value", () => {
    const text = autopilotDoneText("Bóveda DCTY", "118.25", 0.6);
    expect(text).toContain("rebalanceó Bóveda DCTY");
    expect(text).toContain("$118.25");
  });
});
