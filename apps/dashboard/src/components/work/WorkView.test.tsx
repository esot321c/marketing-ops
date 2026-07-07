// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkView } from "./WorkView.js";
import { listWork } from "@/lib/api";

vi.mock("@/lib/api", () => ({ listWork: vi.fn(), getWork: vi.fn() }));

test("shows empty-state prompt when there is no work yet", async () => {
  vi.mocked(listWork).mockResolvedValue([]);
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  expect(await screen.findByText(/Plan a campaign for Example Agency/)).toBeTruthy();
});

test("renders a card for each work item in the list", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "q3", title: "Q3 push", created: "2026-03-01", status: "active" },
  ]);
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  expect(await screen.findByText("Q3 push")).toBeTruthy();
});
