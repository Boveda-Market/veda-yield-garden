import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVATAR_IDS } from "./account-profile";

// The database CHECK constraint must accept every avatar the settings screen offers,
// otherwise saving the profile fails.
describe("profile_avatar constraint", () => {
  it("latest migration defining profile_avatar allows every AVATAR_IDS entry", () => {
    const dir = join(process.cwd(), "drizzle/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const latest = files.map((f) => readFileSync(join(dir, f), "utf8")).filter((s) => /ADD CONSTRAINT profile_avatar|CONSTRAINT profile_avatar CHECK/.test(s)).pop()!;
    for (const id of AVATAR_IDS) expect(latest).toContain(`'${id}'`);
  });
});
