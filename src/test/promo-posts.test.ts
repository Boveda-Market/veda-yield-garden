import { describe, expect, it } from "vitest";
import { PROMO_START, promoCycleFor, promoPost, PROMO_MAX_USD } from "@/lib/promo-posts";

const DAY = 86_400_000;
describe("promo posts", () => {
  it("first promo goes out on Nov 22 2026", () => { expect(promoCycleFor(PROMO_START + 3_600_000)).toBe(0); });
  it("exactly one promo day per 14-day cycle", () => {
    for (let c = 0; c < 6; c++) {
      let n = 0; for (let d = 0; d < 14; d++) if (promoCycleFor(PROMO_START + (c * 14 + d) * DAY + 1) !== null) n++;
      expect(n).toBe(1);
    }
  });
  it("example amounts never exceed $2,500", () => {
    const post = promoPost("calc", { id: "trump", name: "Bóveda TRUMP", volume24h: 1e6, apr: 40 }, 3) + promoPost("case", { id: "trump", name: "Bóveda TRUMP", volume24h: 1e6, apr: 40 }, 3);
    const amounts = [...post.matchAll(/Con \$([\d,]+)|posición de <b>\$([\d,]+)/g)].map((m) => Number((m[1] ?? m[2])!.replace(/,/g, "")));
    expect(Math.max(...amounts)).toBe(PROMO_MAX_USD);
  });
});
