// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayView } from "./TodayView.js";
import { getToday } from "@/lib/api";
import type { ContentItem } from "@/lib/contentTypes";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({ getToday: vi.fn(), postRequest: vi.fn() }));

const item: ContentItem = {
  id: "item-1",
  tenantId: "example-agency",
  channel: "linkedin",
  format: "text-post",
  state: "scheduled",
  title: "Example title",
  angle: "This is the whole pitch for the piece. It runs several sentences long and explains the angle in detail.",
  pillar: "reliability",
  assets: [],
  schedule: { status: "scheduled", date: "2026-07-16" },
  source: [],
  refineLog: [],
};

test("renders the due-today angle as slate text, not inside a ws-pill", async () => {
  vi.mocked(getToday).mockResolvedValue({ due: [item], suggested: [] });

  render(<TodayView tenant="example-agency" onOpen={() => undefined} />);

  const angleText = await screen.findByText(item.angle);
  expect(angleText.className.split(" ")).not.toContain("ws-pill");
});
