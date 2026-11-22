import { describe, expect, it } from "vitest";
import { filterUsers, isOnline, ONLINE_MS, type AdminUser } from "./admin-users";

const now = Date.parse("2026-11-22T22:00:00Z");
const u = (p: Partial<AdminUser>): AdminUser => ({ id: "x", createdAt: null, email: null, name: null, wallet: null, lastSeen: null, screen: null, recharged: false, telegram: false, autopilot: false, affiliate: null, ...p });

describe("admin users", () => {
  it("online means a ping within 2 minutes", () => {
    expect(ONLINE_MS).toBe(120_000);
    expect(isOnline(new Date(now - 119_000).toISOString(), now)).toBe(true);
    expect(isOnline(new Date(now - 121_000).toISOString(), now)).toBe(false);
  });
  it("new means created in the last 7 days", () => {
    const list = [u({ id: "a", createdAt: new Date(now - 6 * 86_400_000).toISOString() }), u({ id: "b", createdAt: new Date(now - 8 * 86_400_000).toISOString() })];
    expect(filterUsers(list, "new", "", now).map((x) => x.id)).toEqual(["a"]);
  });
  it("deposit filters only include checked accounts", () => {
    const list = [u({ id: "a", wallet: "W1" }), u({ id: "b", wallet: "W2" }), u({ id: "c", wallet: "W3" })];
    const h = { W1: { usdc: 0, vaults: 2 }, W2: { usdc: 5, vaults: 0 } };
    expect(filterUsers(list, "vault", "", now, h).map((x) => x.id)).toEqual(["a"]);
    expect(filterUsers(list, "nodeposit", "", now, h).map((x) => x.id)).toEqual(["b"]);
  });
  it("search matches email or partner code", () => {
    const list = [u({ id: "a", email: "ana@mail.com" }), u({ id: "b", affiliate: "ANGEL" })];
    expect(filterUsers(list, "all", "angel", now).map((x) => x.id)).toEqual(["b"]);
    expect(filterUsers(list, "all", "ANA@", now).map((x) => x.id)).toEqual(["a"]);
  });
});
