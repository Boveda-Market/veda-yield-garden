import { describe, expect, it } from "vitest";
import { ANNOUNCEMENTS, announcementSections } from "@/lib/announcements";
import { announcementButton, announcementPost } from "@/lib/telegram.server";

describe("Telegram channel posts", () => {
  it("every announcement fits Telegram's 4096-character message limit", () => {
    for (const a of ANNOUNCEMENTS) expect(announcementPost(a).length).toBeLessThanOrEqual(4096);
  });
  it("splits emoji-led lines into highlights with their own title", () => {
    const s = announcementSections("Intro.\n🎯 Rebalanceo en 1 toque: si tu bóveda sale de rango…");
    expect(s.lead).toBe("Intro.");
    expect(s.items[0]).toEqual({ icon: "🎯", title: "Rebalanceo en 1 toque", text: "Si tu bóveda sale de rango…" });
  });
  it("only links the call to action to the official domain", () => {
    for (const a of ANNOUNCEMENTS) { const b = announcementButton(a); if (b) expect(b.url.startsWith("https://bovedamarket.app")).toBe(true); }
  });
});
