import { beforeEach, describe, expect, it } from "vitest";
import { markOnce, nextSofiaRest, parseSofiaRest, SOFIA_REST_MS, TOUR_CANCEL_KEY } from "@/lib/sofia-controls";

describe("Sofía display preferences", () => {
  beforeEach(() => localStorage.clear());

  it("notifies only on the first cancelled tour across visits", () => {
    expect(markOnce(TOUR_CANCEL_KEY, localStorage)).toBe(true);
    expect(localStorage.getItem(TOUR_CANCEL_KEY)).toBe("1");
    expect(markOnce(TOUR_CANCEL_KEY, localStorage)).toBe(false);
  });

  it("does not start a rest after the first floating-button close", () => {
    expect(nextSofiaRest({ closes: 0, until: 0 }, 1000)).toEqual({ closes: 1, until: 0 });
  });

  it("starts exactly seven days of rest on the second close", () => {
    expect(nextSofiaRest({ closes: 1, until: 0 }, 1000)).toEqual({ closes: 0, until: 604801000 });
    expect(SOFIA_REST_MS).toBe(604800000);
  });

  it("begins a new close cycle after the rest expires", () => {
    expect(nextSofiaRest({ closes: 0, until: 604801000 }, 604801001)).toEqual({ closes: 1, until: 0 });
  });

  it("ignores malformed stored preferences", () => {
    expect(parseSofiaRest('{"closes":-1,"until":0}')).toEqual({ closes: 0, until: 0 });
    expect(parseSofiaRest("invalid")).toEqual({ closes: 0, until: 0 });
  });
});