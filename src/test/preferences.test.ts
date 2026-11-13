import { describe, expect, it } from "vitest";
import { parseContacts, parseHome, validContact } from "@/lib/preferences";
import { AVATAR_MIN_TIER, profileSchema } from "@/lib/account-profile";

describe("account customization", () => {
  it("falls back to Mi wallet for unknown start screens", () => { expect(parseHome("/portfolio")).toBe("/portfolio"); expect(parseHome("/evil")).toBe("/wallet"); });
  it("keeps only valid contacts", () => {
    const good = { name: "Mi Coinbase", address: "So11111111111111111111111111111111111111112" };
    expect(validContact(good)).toBe(true);
    expect(parseContacts(JSON.stringify([good, { name: "x", address: "0xabc" }]))).toEqual([good]);
  });
  it("tier avatars unlock at Plus, Pro and VIP", () => { expect([AVATAR_MIN_TIER.star, AVATAR_MIN_TIER.diamond, AVATAR_MIN_TIER.crown]).toEqual([1, 2, 3]); });
  it("accepts only small image data URLs as photos", () => {
    expect(profileSchema.safeParse({ displayName: "", avatar: "leaf", photo: "data:image/webp;base64,AAAA" }).success).toBe(true);
    expect(profileSchema.safeParse({ displayName: "", avatar: "leaf", photo: "https://evil.example/x.png" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "", avatar: "leaf", photo: "data:image/webp;base64," + "A".repeat(140_001) }).success).toBe(false);
  });
});
