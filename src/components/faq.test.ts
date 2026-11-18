import { describe, it, expect } from "vitest";
import { filterQuestions, questions } from "./faq";

describe("FAQ", () => {
  it("has fewer than 6 questions", () => {
    expect(questions.length).toBe(5);
  });
  it("avoids crypto jargon", () => {
    const text = questions.map((q) => q.question + q.answer).join(" ");
    expect(text).not.toMatch(/\b(USDC|SOL|MET|JupUSD)\b/);
  });
  it("search ignores accents", () => {
    expect(filterQuestions(questions, "all", "algoritmico").map((q) => q.id)).toContain("vaults-earn");
  });
});
