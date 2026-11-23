import { describe, expect, it } from "vitest";
import { pickWeeklyAd } from "./weekly-ad";

describe("weekly ad rotation", () => {
  it("alternates TRUMP and Bitcoin", () => {
    expect(pickWeeklyAd(null, false)).toBe("trump");
    expect(pickWeeklyAd("trump", false)).toBe("btc");
    expect(pickWeeklyAd("btc", false)).toBe("trump");
  });
  it("shows only Bitcoin once TRUMP was touched", () => {
    expect(pickWeeklyAd("btc", true)).toBe("btc");
  });
});
