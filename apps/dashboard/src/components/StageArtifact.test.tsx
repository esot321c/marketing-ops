// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { StageArtifact } from "./StageArtifact.js";
import { getStageArtifact } from "@/lib/api";

let changeListener: ((e: { data: string }) => void) | null = null;
class MockEventSource {
  addEventListener(event: string, listener: (e: { data: string }) => void) {
    if (event === "change") changeListener = listener;
  }
  close() {}
}
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  changeListener = null;
});

vi.mock("@/lib/api", () => ({ getStageArtifact: vi.fn() }));

test("refetches when an SSE change event reports the tenant-first setup path", async () => {
  vi.mocked(getStageArtifact).mockResolvedValue({
    kind: "markdown",
    path: "data/example-agency/setup/icp.md",
    content: "First version",
  });

  render(<StageArtifact tenant="example-agency" stage="icp" />);

  await screen.findByText("First version");
  expect(getStageArtifact).toHaveBeenCalledTimes(1);

  vi.mocked(getStageArtifact).mockResolvedValue({
    kind: "markdown",
    path: "data/example-agency/setup/icp.md",
    content: "Updated version",
  });

  expect(changeListener).toBeTruthy();
  changeListener!({ data: JSON.stringify({ path: "data/example-agency/setup/icp.md" }) });

  await waitFor(() => expect(getStageArtifact).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("Updated version")).toBeTruthy();
});

test("ignores SSE change events for a different tenant's setup path", async () => {
  vi.mocked(getStageArtifact).mockResolvedValue({
    kind: "markdown",
    path: "data/example-agency/setup/icp.md",
    content: "First version",
  });

  render(<StageArtifact tenant="example-agency" stage="icp" />);

  await screen.findByText("First version");
  expect(getStageArtifact).toHaveBeenCalledTimes(1);

  expect(changeListener).toBeTruthy();
  changeListener!({ data: JSON.stringify({ path: "data/other-tenant/setup/icp.md" }) });

  // give any (incorrect) refetch a tick to happen, then assert it did not
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(getStageArtifact).toHaveBeenCalledTimes(1);
});
