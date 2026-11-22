import { describe, expect, it } from "vitest";
import { sinceDeposit, tokenDelta, type VaultFlow } from "./since-deposit";
import type { MeteoraRecord } from "./meteora-history";

const W = "Owner1111111111111111111111111111111111111";
const FEE = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const GTA6 = "99bL7ZdcQxcrkdJDKGoGpAhqZUMYEHzhMvtNadiZJpE8";
const usd = (n: number) => BigInt(Math.round(n * 1e6));
let slot = 0;
const flow = (cash: number, extra: Partial<VaultFlow> = {}): VaultFlow => ({ signature: `s${++slot}`, slot, at: null, cashMicro: usd(cash).toString(), tokens: [], harvestOnly: false, hasWithdraw: false, ...extra });
const harvest = (usdc: number): [VaultFlow, MeteoraRecord] => { const f = flow(0, { harvestOnly: true }); return [f, { id: f.signature, signature: f.signature, at: null, slot: f.slot, pool: GTA6, position: "p", kind: "harvest", tokenRaw: "0", usdcRaw: usd(usdc).toString() }]; };
const bal = (owner: string, amount: number) => ({ owner, mint: USDC, uiTokenAmount: { amount: usd(amount).toString() } });

describe("sinceDeposit", () => {
  it("activation and fees never count as deposited: $105 paid with $5 fee deposits $100", () => {
    const cash = tokenDelta([bal(W, 200), bal(FEE, 0)], [bal(W, 95), bal(FEE, 5)], W, USDC) + tokenDelta([bal(W, 200), bal(FEE, 0)], [bal(W, 95), bal(FEE, 5)], FEE, USDC);
    expect(cash).toBe(-usd(100));
    expect(sinceDeposit([flow(-100)], [], {}, usd(100))?.depositedMicro).toBe(usd(100));
  });
  it("$100 deposited now worth $108 shows +$8 and +8%", () => {
    const r = sinceDeposit([flow(-100)], [], {}, usd(108));
    expect(r?.changeMicro).toBe(usd(8));
    expect(r?.percent).toBe(8);
  });
  it("harvested earnings re-deposited stay earnings, not deposits", () => {
    const d = flow(-100); const [h, rec] = harvest(10);
    const r = sinceDeposit([d, h, flow(-10)], [rec], {}, usd(110));
    expect(r?.depositedMicro).toBe(usd(100));
    expect(r?.changeMicro).toBe(usd(10));
  });
  it("harvested earnings kept in the wallet still count as gain", () => {
    const d = flow(-100); const [h, rec] = harvest(10);
    const r = sinceDeposit([d, h], [rec], {}, usd(100));
    expect(r?.depositedMicro).toBe(usd(100));
    expect(r?.changeMicro).toBe(usd(10));
  });
  it("moving money between vaults keeps the deposited total", () => {
    const r = sinceDeposit([flow(-100), flow(100, { hasWithdraw: true }), flow(-100)], [], {}, usd(100));
    expect(r?.depositedMicro).toBe(usd(100));
    expect(r?.changeMicro).toBe(0n);
  });
  it("a vault token without a price leaves the figure unavailable", () => {
    expect(sinceDeposit([flow(-100, { tokens: [{ pool: GTA6, raw: "5" }] })], [], {}, usd(100))).toBeNull();
  });
});
