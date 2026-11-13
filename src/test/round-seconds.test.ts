import { describe, expect, it } from "vitest";
import { roundSeconds } from "@/components/predict-position-card";
describe("roundSeconds", () => {
  it("15m", () => expect(roundSeconds("Solana Up or Down - November 13, 1:15PM-1:30PM ET")).toBe(900));
  it("5m across noon", () => expect(roundSeconds("Bitcoin Up or Down - November 13, 11:55AM-12:00PM ET")).toBe(300));
  it("4h", () => expect(roundSeconds("Bitcoin Up or Down - November 13, 4:00PM-8:00PM ET")).toBe(14400));
  it("daily", () => expect(roundSeconds("Bitcoin Up or Down on November 13?")).toBe(86400));
});

import { roundWindowText } from "@/components/predict-position-card";
describe("roundWindowText", () => {
  // Real round "1:50PM-1:55PM ET" (closeTime 1794596100) must read 2:50–2:55 PM in Puerto Rico.
  it("local time zone", () => expect(roundWindowText("Bitcoin Up or Down - November 13, 1:50PM-1:55PM ET", 1794596100, "en-US", "America/Puerto_Rico")).toBe("Nov 13 · 2:50 PM – 2:55 PM"));
});
