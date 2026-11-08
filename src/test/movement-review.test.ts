import { describe, expect, it } from "vitest";
import { movementReviewInput, sanitizeFlags } from "@/lib/movement-review";
const m = [{ id: "a", kind: "deposit" as const, vault: "sol", amount: 10, at: 1 }, { id: "b", kind: "withdraw" as const, vault: "sol", amount: 900, at: 2 }];
describe("movement review", () => {
  it("keeps only flags for movements that were sent, once each", () => {
    expect(sanitizeFlags({ flags: [{ id: "b", reason: "Retiro mucho mayor" }, { id: "b", reason: "dup" }, { id: "zzz", reason: "inventado" }] }, m)).toEqual([{ id: "b", reason: "Retiro mucho mayor" }]);
  });
  it("drops empty reasons and invalid model output", () => {
    expect(sanitizeFlags({ flags: [{ id: "a", reason: "  " }] }, m)).toEqual([]);
    expect(sanitizeFlags("nope", m)).toEqual([]);
  });
  it("rejects more than 60 movements", () => {
    expect(movementReviewInput.safeParse({ movements: Array.from({ length: 61 }, (_, i) => ({ ...m[0], id: String(i) })) }).success).toBe(false);
  });
});
