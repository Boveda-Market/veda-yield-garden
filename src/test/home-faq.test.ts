import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/routes/index.tsx", "utf8");
const faqs = source.split("const FAQS = [")[1]?.split("\n];")[0] ?? "";
const entry = faqs.split('{ q: "¿Cómo funciona el Piloto Automático?"')[1]?.split('\n  { q:')[0] ?? "";

describe("Home FAQ Autopilot question", () => {
  it("is present on the home page FAQ", () => {
    expect(faqs).toContain('"¿Cómo funciona el Piloto Automático?"');
  });
  it("states the 5 minute wait, the one-time permission and that it can be turned off", () => {
    expect(entry).toContain("5 minutos");
    expect(entry).toContain("no puede retirar tu dinero");
    expect(entry).toContain("Puedes apagarlo cuando quieras");
  });
  it("stays in plain language with no coin or network jargon", () => {
    expect(entry).not.toMatch(/\b(USDC|SOL|MET|JupUSD)\b/);
    expect(entry).not.toMatch(/Solana|Meteora/i);
  });
});
