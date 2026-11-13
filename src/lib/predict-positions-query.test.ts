import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/predict.functions", () => ({ getPredictPositions: vi.fn() }));
import { predictRefreshMs } from "./predict-positions-query";
import type { PredictPosition } from "./predict";

const pos = (status: string, closeTime: number | null) => ({ status, closeTime }) as PredictPosition;
const now = 1_000_000_000_000;

describe("predictRefreshMs", () => {
  it("polls every 20 s with no open rounds", () => expect(predictRefreshMs([pos("closed", null)], now)).toBe(20_000));
  it("polls every 6 s while a round is open", () => expect(predictRefreshMs([pos("open", now / 1000 + 120)], now)).toBe(6_000));
  it("polls every 3 s near or after the close", () => {
    expect(predictRefreshMs([pos("open", now / 1000 + 10)], now)).toBe(3_000);
    expect(predictRefreshMs([pos("open", now / 1000 - 30)], now)).toBe(3_000);
  });
});
