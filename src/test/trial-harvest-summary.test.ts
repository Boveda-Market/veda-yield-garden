import { describe, expect, it } from "vitest";
import { trialHarvestSummary, type TrialActivity } from "@/lib/trial-activity";
const row = (kind: TrialActivity["kind"], gross: number, fee: number, net: number): TrialActivity => ({ id: kind, kind, gross, fee, net, vaultId: "sol", at: 1 });
describe("portfolio harvested trial earnings", () => {
  it("shows net harvest after 1% and its percentage on recorded deposits", () => {
    expect(trialHarvestSummary([row("deposit", 100, 0, 100), row("harvest", 10, 0.1, 9.9)])).toEqual({ harvested: 9.9, percent: 9.9 });
  });
  it("excludes returned capital and keeps harvests after a position closes", () => {
    expect(trialHarvestSummary([row("deposit", 100, 0, 100), row("harvest", 10, 0.1, 9.9), row("exit", 100, 1, 99)])).toEqual({ harvested: 9.9, percent: 9.9 });
  });
  it("does not invent a percentage when no deposit basis is recorded", () => {
    expect(trialHarvestSummary([])).toEqual({ harvested: 0, percent: null });
    expect(trialHarvestSummary([row("harvest", 10, 0.1, 9.9)]).percent).toBeNull();
  });
});