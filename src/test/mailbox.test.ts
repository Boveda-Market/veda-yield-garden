import { describe, it, expect } from "vitest";
import { rawEmail, decodePart } from "@/lib/mailbox";

describe("rawEmail", () => {
  it("blocks header injection through the subject", () => {
    const raw = decodePart(rawEmail({ from: "admin@bovedamarket.app", to: "a@b.co", subject: "Hola\r\nBcc: evil@x.co", body: "x" }));
    expect(raw.split("\r\n").some((l) => l.startsWith("Bcc:"))).toBe(false);
  });
  it("uses the chosen sender address", () => {
    const raw = decodePart(rawEmail({ from: "dev@bovedamarket.app", to: "a@b.co", subject: "Hi", body: "x" }));
    expect(raw).toContain("<dev@bovedamarket.app>");
  });
});
