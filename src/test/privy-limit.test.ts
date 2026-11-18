import { describe, expect, it } from "vitest";
import { privyLimitError } from "@/lib/autopilot";
describe("privyLimitError", () => {
  it("rate limit 429", () => expect(privyLimitError("Privy 429: too many")).toBe("rate"));
  it("plan limit 403", () => expect(privyLimitError("Privy 403: limit")).toBe("plan"));
  it("other errors ignored", () => expect(privyLimitError("Privy 500: error")).toBeNull());
});
