import { describe, expect, it } from "vitest";
import { accountTier } from "./account-tier";
describe("accountTier", () => {
  it("$50 is Básico, $50 to Plus", () => { const t = accountTier(50); expect(t.name).toBe("Básico"); expect(t.missing).toBe(50); });
  it("$100 is Plus", () => expect(accountTier(100).name).toBe("Plus"));
  it("$500 is Pro", () => expect(accountTier(500).name).toBe("Pro"));
  it("$2,500 is VIP with nothing missing", () => { const t = accountTier(2500); expect(t.name).toBe("VIP"); expect(t.next).toBeNull(); });
});
