import { describe, expect, it } from "vitest";
import { roundSeconds } from "@/components/predict-position-card";
describe("roundSeconds", () => {
  it("15m", () => expect(roundSeconds("Solana Up or Down - November 13, 1:15PM-1:30PM ET")).toBe(900));
  it("5m across noon", () => expect(roundSeconds("Bitcoin Up or Down - November 13, 11:55AM-12:00PM ET")).toBe(300));
  it("daily", () => expect(roundSeconds("Bitcoin Up or Down on November 13?")).toBe(86400));
});
