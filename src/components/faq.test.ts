import { describe, it, expect } from "vitest";
import { filterQuestions, questions } from "./faq";

describe("FAQ filter", () => {
  it("search ignores accents and matches answers", () => {
    expect(filterQuestions(questions, "all", "comision").length).toBeGreaterThan(0);
    expect(filterQuestions(questions, "all", "reclamar ganancias").map((q) => q.id)).toContain("predict-claim");
  });
  it("category limits results", () => {
    expect(filterQuestions(questions, "affiliates", "").every((q) => q.cat === "affiliates")).toBe(true);
  });
  it("no match returns empty", () => {
    expect(filterQuestions(questions, "all", "zzzqqq")).toHaveLength(0);
  });
});
