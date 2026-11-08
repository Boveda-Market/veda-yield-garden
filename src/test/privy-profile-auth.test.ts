// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";
import { generateKeyPair, SignJWT } from "jose";

const state = vi.hoisted(() => ({ publicKey: undefined as CryptoKey | undefined }));
vi.mock("jose", async (load) => {
  const actual = await load<typeof import("jose")>();
  return { ...actual, createRemoteJWKSet: () => async () => { if (!state.publicKey) throw new Error(); return state.publicKey; } };
});
import { verifiedPrivyId } from "@/lib/account-profile.server";

describe("Privy owner authorization for private profiles", () => {
  let privateKey: CryptoKey;
  beforeAll(async () => { const pair = await generateKeyPair("ES256"); privateKey = pair.privateKey; state.publicKey = pair.publicKey; });
  async function token({ audience = "cmw6ftcf900ge0hl0jyw3rc75", issuer = "privy.io", expiry = "2m" } = {}) {
    return new SignJWT({}).setProtectedHeader({ alg: "ES256" }).setSubject("did:privy:owner").setIssuer(issuer).setAudience(audience).setExpirationTime(expiry).sign(privateKey);
  }
  it("derives the owner exclusively from a valid signed Privy subject", async () => {
    await expect(verifiedPrivyId(await token())).resolves.toBe("did:privy:owner");
  });
  it("rejects tokens belonging to a different app", async () => {
    await expect(verifiedPrivyId(await token({ audience: "other-app" }))).rejects.toThrow();
  });
  it("rejects another issuer", async () => {
    await expect(verifiedPrivyId(await token({ issuer: "attacker" }))).rejects.toThrow();
  });
  it("rejects expired access", async () => {
    await expect(verifiedPrivyId(await token({ expiry: "-1m" }))).rejects.toThrow();
  });
  it("rejects unsigned or fabricated access", async () => {
    await expect(verifiedPrivyId("fabricated.access.token")).rejects.toThrow();
  });
});