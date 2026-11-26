import { describe, expect, it } from "vitest";
import { chatWait, looksLikeSecret } from "./support-chat";

describe("support chat limits", () => {
  it("allows 5 questions per minute and blocks the 6th", () => {
    const s = [0, 4000, 8000, 12000, 16000];
    expect(chatWait(s.slice(0, 4), 20000)).toBe(0);
    expect(chatWait(s, 20000)).toBe(40000);
  });
  it("requires 3 seconds between messages", () => {
    expect(chatWait([10000], 11000)).toBe(2000);
  });
  it("detects a 12-word seed phrase", () => {
    expect(looksLikeSecret("apple river stone light house green ocean table music paper chair cloud")).toBe(true);
    expect(looksLikeSecret("como retiro mis dolares")).toBe(false);
  });
});
