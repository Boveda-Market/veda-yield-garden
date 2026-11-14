import { describe, it, expect } from "vitest";
import { rawEmail, decodePart, htmlEmail } from "@/lib/mailbox";

describe("rawEmail", () => {
  it("blocks header injection through the subject", () => {
    const raw = decodePart(rawEmail({ from: "admin@bovedamarket.app", to: "a@b.co", subject: "Hola\r\nBcc: evil@x.co", body: "x" }));
    expect(raw.split("\r\n").some((l) => l.startsWith("Bcc:"))).toBe(false);
  });
  it("uses the chosen sender address", () => {
    const raw = decodePart(rawEmail({ from: "dev@bovedamarket.app", to: "a@b.co", subject: "Hi", body: "x" }));
    expect(raw).toContain("<dev@bovedamarket.app>");
  });
  it("sends a branded HTML part with escaped user text", () => {
    expect(htmlEmail("<script>x</script>")).not.toContain("<script>");
    expect(htmlEmail("hola")).toContain("icon-512.png");
    const raw = decodePart(rawEmail({ from: "a@bovedamarket.app", to: "a@b.co", subject: "Hi", body: "x" }));
    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain("text/html");
  });
});
