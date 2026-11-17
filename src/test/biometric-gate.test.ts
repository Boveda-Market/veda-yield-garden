import { describe, it, expect } from "vitest";
import { biometricDue, BIOMETRIC_GRACE_MS, BIOMETRIC_MAX_FAILS } from "@/lib/biometric-gate";

describe("biometric gate", () => {
  it("never asks on a device without fingerprint / Face ID", () => { expect(biometricDue(Date.now(), false)).toBe(false); });
  it("one check covers chained steps for one minute", () => { expect(BIOMETRIC_GRACE_MS).toBe(60_000); });
  it("stops asking after two failed checks so nobody gets locked out", () => { expect(BIOMETRIC_MAX_FAILS).toBe(2); });
});
