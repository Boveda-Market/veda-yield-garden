import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/account-profile";
import { guestDemoKey, trialActivityKey, readTrialActivity } from "@/lib/trial-activity";
import { demoSessionKey } from "@/lib/demo-session";
describe("optional account personalization", () => {
  it("permits an empty optional name and a selected avatar", () => {
    expect(profileSchema.parse({ displayName: "", avatar: "sun" })).toEqual({ displayName: "", avatar: "sun" });
  });
  it("rejects unsupported avatar values and overlong names", () => {
    expect(profileSchema.safeParse({ displayName: "a".repeat(61), avatar: "sun" }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "Angel", avatar: "admin" }).success).toBe(false);
  });
  it("keeps guest credits and activity separate from registered users", () => {
    expect(guestDemoKey).not.toBe(demoSessionKey("did:privy:alice"));
    expect(trialActivityKey("guest")).not.toBe(trialActivityKey("did:privy:alice"));
  });
  it("never fabricates prior trial activity", () => {
    expect(readTrialActivity(null)).toEqual([]);
    expect(readTrialActivity("broken")).toEqual([]);
  });
});