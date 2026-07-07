// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkView } from "./WorkView.js";
import { listWork } from "@/lib/api";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({ listWork: vi.fn(), getWork: vi.fn() }));

test("shows empty-state prompt when there is no work yet", async () => {
  vi.mocked(listWork).mockResolvedValue([]);
  render(
    <WorkView
      tenant="example-agency"
      tenantName="Example Agency"
      capabilityId="campaigns"
      counts={{ research: 1, keywords: 1, strategy: 1 }}
    />,
  );

  expect(await screen.findByText(/Plan a campaign for Example Agency/)).toBeTruthy();
  expect(
    await screen.findByText(/Turn a goal into a coordinated push with a brief and a schedule\./),
  ).toBeTruthy();
});

test("renders a card for each work item in the list", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "q3", title: "Q3 push", created: "2026-03-01", status: "active" },
  ]);
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  expect(await screen.findByText("Q3 push")).toBeTruthy();
});

test("shows a prerequisite banner recommending missing prep steps", async () => {
  vi.mocked(listWork).mockResolvedValue([]);
  render(
    <WorkView
      tenant="example-agency"
      tenantName="Example Agency"
      capabilityId="campaigns"
      counts={{}}
    />,
  );

  expect(await screen.findByText(/before Campaigns\./)).toBeTruthy();
  expect(await screen.findByText(/Run competitor research for Example Agency/)).toBeTruthy();
});

test("does not show a prerequisite banner for research", async () => {
  vi.mocked(listWork).mockResolvedValue([]);
  render(
    <WorkView
      tenant="example-agency"
      tenantName="Example Agency"
      capabilityId="research"
      counts={{}}
    />,
  );

  await screen.findByText(/Run competitor research for Example Agency/);
  expect(screen.queryByText(/before Research\./)).toBeNull();
});
