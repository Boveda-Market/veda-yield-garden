import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { en } from "@/i18n/en";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return ["test", "i18n", "integrations"].includes(d.name) ? [] : files(p);
    return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
  });
}

describe("English coverage", () => {
  it("every literal t() text has an English translation", () => {
    const re = /\bt\(\s*"((?:\\.|[^"\\])*)"\s*[,)]/g;
    const missing: string[] = [];
    for (const f of files("src")) for (const m of readFileSync(f, "utf8").matchAll(re)) {
      const key = JSON.parse(`"${m[1]}"`) as string;
      if (!(key in en)) missing.push(`${f}: ${key}`);
    }
    expect(missing).toEqual([]);
  });
});
