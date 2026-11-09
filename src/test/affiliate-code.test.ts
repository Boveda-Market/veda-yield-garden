// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  verifiedPrivyId: vi.fn(),
  update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: (validate: (input: unknown) => unknown) => ({
    handler: (handler: (input: { data: unknown }) => unknown) => (input: { data: unknown }) => handler({ data: validate(input.data) }),
  }) }),
}));
vi.mock("@/lib/account-profile.server", () => ({ verifiedPrivyId: state.verifiedPrivyId }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ update: state.update }) } }));
import { customizeAffiliateCode } from "@/lib/affiliate.functions";

describe("owner-scoped affiliate link customization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.verifiedPrivyId.mockResolvedValue("did:privy:owner");
    state.update.mockReturnValue({ eq: state.eq });
    state.eq.mockReturnValue({ select: state.select });
    state.select.mockReturnValue({ maybeSingle: state.maybeSingle });
    state.maybeSingle.mockResolvedValue({ data: { code: "ANGEL60" }, error: null });
  });
  const request = () => customizeAffiliateCode({ data: { token: "x".repeat(20), code: "angel60" } });
  it("updates only the verified owner's code, keeping referral identity unchanged", async () => {
    expect(await request()).toEqual({ success: true });
    expect(state.eq).toHaveBeenCalledWith("privy_user_id", "did:privy:owner");
    expect(state.update).toHaveBeenCalledWith({ code: "ANGEL60" });
  });
  it("rejects a code already owned by another affiliate", async () => {
    state.maybeSingle.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect((await request()).success).toBe(false);
  });
  it("rejects unverified sessions without writing", async () => {
    state.verifiedPrivyId.mockRejectedValue(new Error("invalid"));
    expect((await request()).success).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
  });
  it("does not report success for an absent affiliate", async () => {
    state.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await request()).success).toBe(false);
  });
});