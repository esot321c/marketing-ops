// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsCharts } from "./AnalyticsCharts.js";
import { getAnalytics, getBoard } from "@/lib/api";
import type { AnalyticsPost } from "@/lib/analyticsTypes";
import type { ContentItem, ContentState } from "@/lib/contentTypes";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({ getAnalytics: vi.fn(), getBoard: vi.fn() }));

const EMPTY_BOARD: Record<ContentState, ContentItem[]> = {
  idea: [],
  drafting: [],
  in_review: [],
  approved: [],
  scheduled: [],
  posted: [],
  measured: [],
  needs_work: [],
  parked: [],
};

function contentItem(overrides: Partial<ContentItem>): ContentItem {
  return {
    id: "item-1",
    tenantId: "example-agency",
    channel: "linkedin",
    format: "text-post",
    state: "posted",
    title: "Untitled item",
    angle: "a",
    pillar: "p",
    assets: [],
    schedule: { status: "unscheduled" },
    source: [],
    refineLog: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
});

function post(overrides: Partial<AnalyticsPost>): AnalyticsPost {
  return {
    id: "p1",
    title: "Untitled",
    captures: [],
    ...overrides,
  };
}

test("shows the empty state pointing at the imports folder when there are no posts", async () => {
  vi.mocked(getAnalytics).mockResolvedValue({ posts: [] });
  render(<AnalyticsCharts tenant="example-agency" />);

  expect(
    await screen.findByText(/data\/example-agency\/analytics\/imports\//),
  ).toBeTruthy();
});

test("renders a table row per post with the latest capture values", async () => {
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [
      post({
        id: "p1",
        title: "First post",
        postedAt: "2026-06-01",
        format: "carousel",
        linkPlacement: "none",
        captures: [
          {
            capturedAt: "2026-06-02",
            source: "xlsx-import",
            impressions: 100,
            membersReached: 80,
            inNetworkPct: 50,
            socialEngagements: 10,
            reactions: 5,
            comments: 2,
            reposts: 1,
            saves: 0,
            sends: 0,
            linkEngagements: 3,
            premiumButtonEngagements: 0,
            profileViewers: 4,
            followersGained: 1,
          },
          {
            capturedAt: "2026-06-05",
            source: "xlsx-import",
            impressions: 200,
            membersReached: 150,
            inNetworkPct: 55,
            socialEngagements: 20,
            reactions: 10,
            comments: 4,
            reposts: 2,
            saves: 0,
            sends: 0,
            linkEngagements: 6,
            premiumButtonEngagements: 0,
            profileViewers: 8,
            followersGained: 2,
          },
        ],
      }),
      post({
        id: "p2",
        title: "Second post",
        postedAt: "2026-06-03",
        format: "text",
        linkPlacement: "self-comment",
        captures: [
          {
            capturedAt: "2026-06-04",
            source: "xlsx-import",
            impressions: 300,
            membersReached: 250,
            inNetworkPct: 60,
            socialEngagements: 30,
            reactions: 15,
            comments: 6,
            reposts: 3,
            saves: 1,
            sends: 1,
            linkEngagements: 9,
            premiumButtonEngagements: 1,
            profileViewers: 12,
            followersGained: 3,
          },
        ],
      }),
    ],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  expect(await screen.findByText("First post")).toBeTruthy();
  expect(screen.getByText("Second post")).toBeTruthy();
  // Latest capture for p1 is the 2026-06-05 one (impressions 200), not the first (100).
  const table = screen.getByTestId("analytics-post-table");
  expect(table.textContent).toContain("200");
  expect(table.textContent).not.toContain("100");
  expect(table.textContent).toContain("300");
});

test("renders a dash for null impressions instead of 0", async () => {
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [
      post({
        id: "p1",
        title: "No impressions post",
        captures: [
          {
            capturedAt: "2026-06-02",
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
          },
        ],
      }),
    ],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  const table = await screen.findByTestId("analytics-post-table");
  const row = screen.getByText("No impressions post").closest("tr");
  expect(row).toBeTruthy();
  expect(row!.textContent).toContain("-");
  expect(table.textContent).not.toMatch(/\b0\b/);
});

test("funnel sums latest captures only, not every historical capture", async () => {
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [
      post({
        id: "p1",
        title: "First post",
        captures: [
          {
            capturedAt: "2026-06-01",
            source: "xlsx-import",
            impressions: 1000,
            membersReached: 900,
            inNetworkPct: 50,
            socialEngagements: 500,
            reactions: 0,
            comments: 0,
            reposts: 0,
            saves: 0,
            sends: 0,
            linkEngagements: 0,
            premiumButtonEngagements: 0,
            profileViewers: 400,
            followersGained: 300,
          },
          {
            capturedAt: "2026-06-10",
            source: "xlsx-import",
            impressions: 100,
            membersReached: 90,
            inNetworkPct: 50,
            socialEngagements: 50,
            reactions: 0,
            comments: 0,
            reposts: 0,
            saves: 0,
            sends: 0,
            linkEngagements: 0,
            premiumButtonEngagements: 0,
            profileViewers: 40,
            followersGained: 30,
          },
        ],
      }),
      post({
        id: "p2",
        title: "Second post",
        captures: [
          {
            capturedAt: "2026-06-04",
            source: "xlsx-import",
            impressions: 50,
            membersReached: 45,
            inNetworkPct: 50,
            socialEngagements: 25,
            reactions: 0,
            comments: 0,
            reposts: 0,
            saves: 0,
            sends: 0,
            linkEngagements: 0,
            premiumButtonEngagements: 0,
            profileViewers: 20,
            followersGained: 15,
          },
        ],
      }),
    ],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  // Latest capture for p1 is impressions 100 (not 1000); plus p2's 50 => funnel impressions = 150.
  const funnel = await screen.findByTestId("analytics-funnel");
  expect(funnel.textContent).toContain("150");
  expect(funnel.textContent).not.toContain("1050");
});

test("shows the linked content item's title when a post has an itemId, not the stored title", async () => {
  vi.mocked(getBoard).mockResolvedValue({
    ...EMPTY_BOARD,
    posted: [contentItem({ id: "item-1", title: "Linked item title" })],
  });
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: "Stored slug title", itemId: "item-1" })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  expect(await screen.findByText("Linked item title")).toBeTruthy();
  expect(screen.queryByText("Stored slug title")).toBeNull();
});

test("falls back to the stored title when itemId has no matching content item", async () => {
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: "Stored slug title", itemId: "missing-item" })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  expect(await screen.findByText("Stored slug title")).toBeTruthy();
});

test("falls back to the stored title when a post has no itemId", async () => {
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: "Stored slug title" })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  expect(await screen.findByText("Stored slug title")).toBeTruthy();
});

test("table title cell truncates visually via CSS ellipsis but keeps the full title in the title attribute", async () => {
  const longTitle = "This is a very long content item title that exceeds forty characters easily";
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: longTitle })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  const cell = await screen.findByTitle(longTitle);
  expect(cell.textContent).toBe(longTitle);
  const style = (cell as HTMLElement).style;
  expect(style.overflow).toBe("hidden");
  expect(style.textOverflow).toBe("ellipsis");
  expect(style.whiteSpace).toBe("nowrap");
});

test("channel column renders a badge with the post's channel", async () => {
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: "Channel post", channel: "linkedin" })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  const table = await screen.findByTestId("analytics-post-table");
  const badge = table.querySelector('[data-slot="badge"]');
  expect(badge).toBeTruthy();
  expect(badge!.textContent).toBe("linkedin");
});

test("channel column renders a dash when the post has no channel", async () => {
  vi.mocked(getBoard).mockResolvedValue(EMPTY_BOARD);
  vi.mocked(getAnalytics).mockResolvedValue({
    posts: [post({ id: "p1", title: "No channel post" })],
  });

  render(<AnalyticsCharts tenant="example-agency" />);

  await screen.findByTestId("analytics-post-table");
  const row = screen.getByText("No channel post").closest("tr");
  expect(row).toBeTruthy();
  expect(row!.querySelector('[data-slot="badge"]')).toBeNull();
  expect(row!.textContent).toContain("-");
});
