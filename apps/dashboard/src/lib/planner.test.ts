import { test, expect } from "vitest";
import { dueItems, suggestedGaps, todayView } from "./planner.js";
import type { Cadence, ContentItem } from "./contentTypes.js";

function item(p: Partial<ContentItem> & { id: string }): ContentItem {
  return {
    tenantId: "example-personal", channel: "linkedin", format: "text-post",
    state: "scheduled", title: p.id, angle: "reliability", pillar: "reliability",
    assets: [], schedule: { status: "scheduled" }, source: [], refineLog: [], ...p,
  } as ContentItem;
}

const cadence: Cadence = {
  tenantId: "example-personal",
  perWeek: { "linkedin/text-post": 2 },
  engagement: "daily",
  pillars: [{ name: "reliability", weight: 3 }, { name: "trust", weight: 1 }],
  updatedBy: [],
};

test("dueItems returns scheduled items due today or earlier, not posted", () => {
  const items = [
    item({ id: "due", schedule: { status: "scheduled", date: "2026-07-01" } }),
    item({ id: "future", schedule: { status: "scheduled", date: "2026-07-10" } }),
    item({ id: "posted", state: "posted", schedule: { status: "posted", date: "2026-06-30" } }),
  ];
  expect(dueItems(items, "2026-07-02").map((i) => i.id)).toEqual(["due"]);
});

test("suggestedGaps fills the weekly shortfall, highest-weight pillar not yet used", () => {
  const gaps = suggestedGaps([], cadence, "2026-07-02");
  expect(gaps).toHaveLength(2);
  expect(gaps[0]).toEqual({ channel: "linkedin", format: "text-post", pillar: "reliability" });
  expect(gaps[1]!.pillar).toBe("trust");
});

test("suggestedGaps cycles back to the highest weight once all pillars are used", () => {
  const c = { ...cadence, perWeek: { "linkedin/text-post": 3 } };
  const gaps = suggestedGaps([], c, "2026-07-02");
  expect(gaps.map((g) => g.pillar)).toEqual(["reliability", "trust", "reliability"]);
});

test("suggestedGaps subtracts items already scheduled this week and skips their pillar", () => {
  const made = item({ id: "made", pillar: "reliability", schedule: { status: "scheduled", date: "2026-07-01" } });
  const gaps = suggestedGaps([made], cadence, "2026-07-02");
  expect(gaps).toHaveLength(1); // 2 target - 1 made = 1 shortfall
  expect(gaps[0]!.pillar).toBe("trust"); // reliability already used this week
});

test("suggestedGaps ignores items scheduled in a prior week", () => {
  const priorSunday = item({ id: "prior", schedule: { status: "scheduled", date: "2026-06-28" } });
  const gaps = suggestedGaps([priorSunday], cadence, "2026-07-02");
  expect(gaps).toHaveLength(2); // prior-week item does not reduce this week's shortfall
});

test("todayView combines due and suggested", () => {
  const view = todayView([], cadence, "2026-07-02");
  expect(view.due).toEqual([]);
  expect(view.suggested).toHaveLength(2);
});
