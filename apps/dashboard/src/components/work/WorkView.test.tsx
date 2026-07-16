// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkView } from "./WorkView.js";
import { listWork, getWork, setWorkStatus } from "@/lib/api";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({ listWork: vi.fn(), getWork: vi.fn(), setWorkStatus: vi.fn() }));

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
  vi.mocked(getWork).mockResolvedValue({
    slug: "q3",
    title: "Q3 push",
    created: "2026-03-01",
    status: "active",
    body: "Q3 body.",
  });
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  expect(await screen.findByText("Q3 push")).toBeTruthy();
});

test("auto-opens the newest artifact and shows its body without a click", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "new", title: "Newest", created: "2026-05-01", status: "ready" },
    { slug: "old", title: "Oldest", created: "2026-01-01", status: "ready" },
  ]);
  vi.mocked(getWork).mockImplementation(async (_t, _c, slug) => ({
    slug,
    title: slug,
    created: "2026-05-01",
    status: "ready",
    body: `${slug} body.`,
  }));
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="research" />);

  // Newest body is visible immediately; older one stays collapsed.
  expect(await screen.findByText("new body.")).toBeTruthy();
  expect(screen.queryByText("old body.")).toBeNull();
});

test("collapses the open artifact when its header is clicked", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "only", title: "Only doc", created: "2026-05-01", status: "ready" },
  ]);
  vi.mocked(getWork).mockResolvedValue({
    slug: "only",
    title: "Only doc",
    created: "2026-05-01",
    status: "ready",
    body: "Only body.",
  });
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="research" />);

  const body = await screen.findByText("Only body.");
  expect(body).toBeTruthy();

  fireEvent.click(screen.getByText("Only doc"));
  expect(screen.queryByText("Only body.")).toBeNull();
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

test("clicking Approve calls setWorkStatus with approved", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "q3", title: "Q3 push", created: "2026-03-01", status: "in_review" },
  ]);
  vi.mocked(getWork).mockResolvedValue({
    slug: "q3",
    title: "Q3 push",
    created: "2026-03-01",
    status: "in_review",
    body: "Q3 body.",
  });
  vi.mocked(setWorkStatus).mockResolvedValue(undefined);
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  const approveButton = await screen.findByText("Approve");
  fireEvent.click(approveButton);

  expect(setWorkStatus).toHaveBeenCalledWith("example-agency", "campaigns", "q3", "approved");
});

test("shows an error message when Approve fails", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "q3", title: "Q3 push", created: "2026-03-01", status: "in_review" },
  ]);
  vi.mocked(getWork).mockResolvedValue({
    slug: "q3",
    title: "Q3 push",
    created: "2026-03-01",
    status: "in_review",
    body: "Q3 body.",
  });
  vi.mocked(setWorkStatus).mockRejectedValue(new Error("Request failed: 500"));
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  const approveButton = await screen.findByText("Approve");
  fireEvent.click(approveButton);

  expect(await screen.findByText(/Request failed: 500/)).toBeTruthy();
});

test("archived docs are hidden by default and shown via the Show archived toggle", async () => {
  vi.mocked(listWork).mockResolvedValue([
    { slug: "live", title: "Live doc", created: "2026-03-01", status: "in_review" },
    { slug: "old", title: "Archived doc", created: "2026-01-01", status: "archived" },
  ]);
  vi.mocked(getWork).mockImplementation(async (_t, _c, slug) => ({
    slug,
    title: slug,
    created: "2026-01-01",
    status: slug === "old" ? "archived" : "in_review",
    body: `${slug} body.`,
  }));
  render(<WorkView tenant="example-agency" tenantName="Example Agency" capabilityId="campaigns" />);

  await screen.findByText("Live doc");
  expect(screen.queryByText("Archived doc")).toBeNull();

  const toggle = await screen.findByText("Show archived (1)");
  fireEvent.click(toggle);

  expect(await screen.findByText("Archived doc")).toBeTruthy();
});
