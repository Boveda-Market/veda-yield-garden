import { describe, expect, it } from "vitest";
import { orderStateOf, refundsFromHistory } from "./predict-refunds";

const O = "EPRyChxDKKLfuvrzTymFKthjTWruBqETTQMp7j5opvvo";
const now = 1_794_690_000;

describe("Sube/Baja refunds", () => {
  it("failed orders are refunds, filled ones are active, anything else waits", () => {
    expect(orderStateOf("failed")).toBe("refunded");
    expect(orderStateOf("filled")).toBe("filled");
    expect(orderStateOf("partiallyfilled")).toBe("filled");
    expect(orderStateOf("created")).toBe("pending");
    expect(orderStateOf(undefined)).toBe("pending");
  });
  it("a failed buy shows the refunded amount once", () => {
    const ev = { eventType: "order_failed", orderPubkey: O, marketId: "POLY-1-0", isBuy: true, transferAmountToken: "5000000", timestamp: now - 60 };
    const r = refundsFromHistory([ev, { ...ev, eventType: "order_closed" }, ev], now);
    expect(r).toHaveLength(1);
    expect(r[0]!.amountMicro).toBe("5000000");
  });
  it("closed or filled orders are not refunds", () => {
    expect(refundsFromHistory([{ eventType: "order_closed", orderPubkey: O, isBuy: true, transferAmountToken: "20401", timestamp: now }], now)).toEqual([]);
  });
  it("refunds older than 24 hours stop showing", () => {
    expect(refundsFromHistory([{ eventType: "order_failed", orderPubkey: O, isBuy: true, transferAmountToken: "5000000", timestamp: now - 25 * 3600 }], now)).toEqual([]);
  });
});
