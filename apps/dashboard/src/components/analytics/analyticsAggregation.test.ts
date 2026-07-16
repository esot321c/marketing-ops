import { test, expect } from "vitest";
import {
  postTableRows,
  impressionSeries,
  funnelData,
  formatComparison,
  audiencePanel,
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
