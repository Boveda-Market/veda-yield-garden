import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./lazy-reload";

describe("isChunkLoadError", () => {
  it("detects a missing chunk after an app update", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/@oj-start/privy-access-DRSBSBgv.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });
  it("ignores ordinary errors so real bugs still surface", () => {
    expect(isChunkLoadError(new Error("Invitado solo puede usar Prueba"))).toBe(false);
  });
});
