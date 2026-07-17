import { test, expect } from "vitest";
import {
  postTableRows,
  impressionSeries,
  funnelData,
  formatComparison,
  audiencePanel,
  truncateTitle,
  formatTooltipTimestamp,
  formatAxisDate,
} from "./analyticsAggregation.js";
import type { AnalyticsCapture, AnalyticsPost } from "@/lib/analyticsTypes";

function capture(overrides: Partial<AnalyticsCapture>): AnalyticsCapture {
  return {
    capturedAt: "2026-06-01",
    source: "xlsx-import",
    impressions: null,
    membersReached: null,
    inNetworkPct: null,
    socialEngagements: null,
    reactions: null,
    comments: null,
    reposts: null,
    saves: null,
    sends: null,
    linkEngagements: null,
    premiumButtonEngagements: null,
    profileViewers: null,
    followersGained: null,
    ...overrides,
  };
}

function post(overrides: Partial<AnalyticsPost>): AnalyticsPost {
  return { id: "p1", title: "Untitled", captures: [], ...overrides };
}

test("postTableRows picks the latest capture by capturedAt, not array order", () => {
  const p = post({
    id: "p1",
    title: "A",
    captures: [
      capture({ capturedAt: "2026-06-05", impressions: 200 }),
      capture({ capturedAt: "2026-06-01", impressions: 100 }),
    ],
  });
  const rows = postTableRows([p]);
  expect(rows[0]!.impressions).toBe(200);
});

test("postTableRows returns null metrics for a post with no captures", () => {
  const rows = postTableRows([post({ id: "p1", title: "A", captures: [] })]);
  expect(rows[0]!.impressions).toBeNull();
});

test("postTableRows uses the stored title by default", () => {
  const rows = postTableRows([post({ id: "p1", title: "Stored title" })]);
  expect(rows[0]!.title).toBe("Stored title");
});

test("postTableRows uses the resolved title from titleFor when provided", () => {
  const p = post({ id: "p1", title: "Stored title", itemId: "item-1" });
  const rows = postTableRows([p], (post) => (post.itemId ? "Linked item title" : post.title));
  expect(rows[0]!.title).toBe("Linked item title");
});

test("postTableRows carries the channel field through", () => {
  const rows = postTableRows([post({ id: "p1", channel: "linkedin" })]);
  expect(rows[0]!.channel).toBe("linkedin");
});

test("postTableRows leaves channel undefined when absent", () => {
  const rows = postTableRows([post({ id: "p1" })]);
  expect(rows[0]!.channel).toBeUndefined();
});

test("impressionSeries sorts points chronologically", () => {
  const p = post({
    captures: [
      capture({ capturedAt: "2026-06-05", impressions: 200 }),
      capture({ capturedAt: "2026-06-01", impressions: 100 }),
    ],
  });
  const series = impressionSeries([p]);
  expect(series[0]!.points.map((pt) => pt.capturedAt)).toEqual(["2026-06-01", "2026-06-05"]);
});

test("impressionSeries uses the resolved title from titleFor when provided", () => {
  const p = post({ id: "p1", title: "Stored title", itemId: "item-1" });
  const series = impressionSeries([p], (post) => (post.itemId ? "Linked item title" : post.title));
  expect(series[0]!.title).toBe("Linked item title");
});

test("truncateTitle passes short titles through unchanged", () => {
  expect(truncateTitle("Short title")).toBe("Short title");
});

test("truncateTitle truncates to 40 characters with an ellipsis character, not an em dash", () => {
  const long = "This is a very long content item title that exceeds forty characters easily";
  const result = truncateTitle(long);
  expect(result.length).toBe(40);
  expect(result.endsWith("...")).toBe(true);
  expect(result).not.toContain("—");
  expect(result).toBe(long.slice(0, 37) + "...");
});

test("truncateTitle respects a custom max length", () => {
  expect(truncateTitle("abcdefghij", 5)).toBe("ab...");
});

test("formatTooltipTimestamp renders ISO timestamps as YYYY-MM-DD HH:mm in local time", () => {
  const iso = new Date(2026, 5, 2, 14, 5).toISOString();
  expect(formatTooltipTimestamp(iso)).toBe("2026-06-02 14:05");
});

test("formatTooltipTimestamp pads single-digit month, day, hour and minute", () => {
  const iso = new Date(2026, 0, 5, 9, 3).toISOString();
  expect(formatTooltipTimestamp(iso)).toBe("2026-01-05 09:03");
});

test("formatTooltipTimestamp returns the raw value when it cannot be parsed as a date", () => {
  expect(formatTooltipTimestamp("not-a-date")).toBe("not-a-date");
});

test("formatAxisDate renders ISO timestamps as YYYY-MM-DD in local time", () => {
  const iso = new Date(2026, 5, 2, 14, 5).toISOString();
  expect(formatAxisDate(iso)).toBe("2026-06-02");
});

test("formatAxisDate pads single-digit month and day", () => {
  const iso = new Date(2026, 0, 5, 9, 3).toISOString();
  expect(formatAxisDate(iso)).toBe("2026-01-05");
});

test("formatAxisDate returns the raw value when it cannot be parsed as a date", () => {
  expect(formatAxisDate("not-a-date")).toBe("not-a-date");
});

test("funnelData sums only the latest capture per post", () => {
  const p1 = post({
    id: "p1",
    captures: [
      capture({ capturedAt: "2026-06-01", impressions: 1000, membersReached: 900, socialEngagements: 500, profileViewers: 400, followersGained: 300 }),
      capture({ capturedAt: "2026-06-10", impressions: 100, membersReached: 90, socialEngagements: 50, profileViewers: 40, followersGained: 30 }),
    ],
  });
  const p2 = post({
    id: "p2",
    captures: [capture({ capturedAt: "2026-06-04", impressions: 50, membersReached: 45, socialEngagements: 25, profileViewers: 20, followersGained: 15 })],
  });
  const funnel = funnelData([p1, p2]);
  const impressions = funnel.find((f) => f.metric === "Impressions");
  expect(impressions?.value).toBe(150);
});

test("funnelData treats null metrics as 0 in the sum", () => {
  const p = post({ captures: [capture({ capturedAt: "2026-06-01", impressions: null })] });
  const funnel = funnelData([p]);
  expect(funnel.find((f) => f.metric === "Impressions")?.value).toBe(0);
});

test("formatComparison is omitted when every post shares one format", () => {
  const posts = [
    post({ id: "p1", format: "carousel", captures: [capture({ impressions: 100, socialEngagements: 10 })] }),
    post({ id: "p2", format: "carousel", captures: [capture({ impressions: 200, socialEngagements: 20 })] }),
  ];
  expect(formatComparison(posts)).toEqual([]);
});

test("formatComparison computes median impressions and social engagements per format", () => {
  const posts = [
    post({ id: "p1", format: "carousel", captures: [capture({ impressions: 100, socialEngagements: 10 })] }),
    post({ id: "p2", format: "carousel", captures: [capture({ impressions: 300, socialEngagements: 30 })] }),
    post({ id: "p3", format: "text", captures: [capture({ impressions: 50, socialEngagements: 5 })] }),
  ];
  const result = formatComparison(posts);
  const carousel = result.find((r) => r.format === "carousel");
  expect(carousel?.medianImpressions).toBe(200);
  const text = result.find((r) => r.format === "text");
  expect(text?.medianImpressions).toBe(50);
});

test("audiencePanel averages pct per label from each post's most recent demographic capture", () => {
  const p1 = post({
    id: "p1",
    captures: [
      capture({
        capturedAt: "2026-06-01",
        demographics: {
          jobTitles: [],
          locations: [],
          seniority: [{ label: "Senior", pct: 40 }],
          industries: [],
          companySizes: [],
        },
      }),
    ],
  });
  const p2 = post({
    id: "p2",
    captures: [
      capture({
        capturedAt: "2026-06-02",
        demographics: {
          jobTitles: [],
          locations: [],
          seniority: [{ label: "Senior", pct: 60 }],
          industries: [],
          companySizes: [],
        },
      }),
    ],
  });
  const audience = audiencePanel([p1, p2]);
  expect(audience.seniority).toEqual([{ label: "Senior", avgPct: 50 }]);
});

test("audiencePanel uses the most recent capture with demographics, ignoring later captures without them", () => {
  const p = post({
    captures: [
      capture({
        capturedAt: "2026-06-01",
        demographics: {
          jobTitles: [],
          locations: [],
          seniority: [{ label: "Senior", pct: 40 }],
          industries: [],
          companySizes: [],
        },
      }),
      capture({ capturedAt: "2026-06-05" }),
    ],
  });
  const audience = audiencePanel([p]);
  expect(audience.seniority).toEqual([{ label: "Senior", avgPct: 40 }]);
});
