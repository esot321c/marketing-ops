// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Composer } from "./Composer.js";
import { getItem, getDesignTokens } from "@/lib/api";
import type { ContentItem } from "@/lib/contentTypes";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({
  getItem: vi.fn(),
  getDesignTokens: vi.fn(),
  postState: vi.fn(),
  postRefine: vi.fn(),
  getRunModes: vi.fn().mockResolvedValue({
    modes: ["chat"],
    posture: { hasOauthToken: false, hasApiKey: false, localBackend: false },
  }),
}));

const item: ContentItem = {
  id: "item-1",
  tenantId: "example-agency",
  channel: "linkedin",
  format: "text-post",
  state: "drafting",
  title: "Example title",
  angle: "This is the whole pitch for the piece. It runs several sentences long and explains the angle in detail.",
  pillar: "reliability",
  assets: [],
  schedule: { status: "unscheduled" },
  source: [],
  refineLog: [],
};

test("renders the angle as a readable block outside the pill row, not inside a ws-pill", async () => {
  vi.mocked(getItem).mockResolvedValue(item);
  vi.mocked(getDesignTokens).mockResolvedValue(null);

  render(<Composer tenant="example-agency" tenantName="Example Agency" itemId="item-1" />);

  const angleText = await screen.findByText(item.angle);
  expect(angleText.className.split(" ")).not.toContain("ws-pill");
  expect(screen.getByText("Angle")).toBeTruthy();
});

test("omits the angle block entirely when the item has no angle", async () => {
  vi.mocked(getItem).mockResolvedValue({ ...item, angle: "" });
  vi.mocked(getDesignTokens).mockResolvedValue(null);

  render(<Composer tenant="example-agency" tenantName="Example Agency" itemId="item-1" />);

  await screen.findByText(item.title);
  expect(screen.queryByText("Angle")).toBeNull();
});
