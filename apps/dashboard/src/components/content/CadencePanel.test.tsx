// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CadencePanel } from "./CadencePanel.js";
import { getCadence, getToday } from "@/lib/api";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({ getCadence: vi.fn(), getToday: vi.fn() }));

test("renders weekly targets, pillars, and the adjust-in-chat prompt from real cadence data", async () => {
  vi.mocked(getCadence).mockResolvedValue({
    tenantId: "example-agency",
    perWeek: { "linkedin/carousel": 2 },
    engagement: "daily",
    pillars: [{ name: "reliability", weight: 3 }],
    updatedBy: [],
  });
  vi.mocked(getToday).mockResolvedValue({
    due: [],
    suggested: [{ channel: "linkedin", format: "carousel", pillar: "reliability" }],
  });

  render(<CadencePanel tenant="example-agency" tenantName="Example Agency" />);

  expect(await screen.findByText("linkedin/carousel")).toBeTruthy();
  expect(await screen.findByText("reliability")).toBeTruthy();
  expect(await screen.findByText("Adjust the cadence for Example Agency")).toBeTruthy();
});
