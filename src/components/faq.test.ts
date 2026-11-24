import { describe, it, expect } from "vitest";
import { filterQuestions, questions } from "./faq";

describe("FAQ", () => {
  it("has 10 questions", () => {
    expect(questions.length).toBe(10);
  });
  it("explains Autopilot in vault terms", () => {
    const q = questions.find((x) => x.id === "vaults-autopilot");
    expect(q?.cat).toBe("vaults");
    expect(q?.answer).toMatch(/magia/);
  });
  it("avoids crypto jargon", () => {
    const text = questions.map((q) => q.question + q.answer).join(" ");
    expect(text).not.toMatch(/\b(USDC|SOL|MET|JupUSD)\b/);
  });
  it("search ignores accents", () => {
    expect(filterQuestions(questions, "all", "algoritmico").map((q) => q.id)).toContain("vaults-earn");
  });
});
