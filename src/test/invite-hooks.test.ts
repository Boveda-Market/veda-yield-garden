import { describe, it, expect } from "vitest";
import { exampleEarning, hookLink } from "@/lib/invite-hooks";
describe("invite hooks", () => {
  it("$100 exit (1% Plus tier) earns the inviter 50¢", () => expect(exampleEarning(100)).toBe(500_000n));
  it("$50 exit (1.5% tier) earns 37.5¢", () => expect(exampleEarning(50)).toBe(375_000n));
  it("gta6 link lands on the GTA6 home", () => expect(hookLink("https://x/?ref=AB", "gta6")).toBe("https://x/gta6?ref=AB"));
  it("other hooks keep the plain link", () => expect(hookLink("https://x/?ref=AB", "duel")).toBe("https://x/?ref=AB"));
});
