// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PipelineBoard } from "./PipelineBoard.js";
import { getBoard, postState } from "@/lib/api";
import type { ContentItem, ContentState } from "@/lib/contentTypes";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({
  getBoard: vi.fn(),
  postState: vi.fn(),
  getItem: vi.fn(),
}));

function makeItem(id: string, state: ContentState, title: string): ContentItem {
  return {
    id,
    tenantId: "example-agency",
    channel: "linkedin",
    format: "text-post",
    state,
    title,
    angle: `Full angle text for ${title}, explaining the pitch in detail across a couple of sentences.`,
    pillar: "reliability",
    assets: [],
    schedule: { status: "unscheduled" },
    source: ["verified-source-a"],
    refineLog: [],
  };
}

function emptyBoard(): Record<ContentState, ContentItem[]> {
  return {
    idea: [],
    drafting: [],
    in_review: [],
    approved: [],
    scheduled: [],
    posted: [],
    measured: [],
  };
}

test("clicking an idea card opens the review popup instead of navigating", async () => {
  const ideaItem = makeItem("idea-1", "idea", "Idea title");
  const board = { ...emptyBoard(), idea: [ideaItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);

  const card = await screen.findByText("Idea title");
  fireEvent.click(card);

  expect(await screen.findByText(ideaItem.angle)).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
});

test("clicking a drafting-column card navigates via onOpen and does not open the popup", async () => {
  const draftingItem = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [draftingItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);

  const card = await screen.findByText("Drafting title");
  fireEvent.click(card);

  expect(onOpen).toHaveBeenCalledWith("drafting-1");
  expect(screen.queryByText(draftingItem.angle)).toBeNull();
});

test("Move to drafting in the popup issues the state change and closes the popup", async () => {
  const ideaItem = makeItem("idea-1", "idea", "Idea title");
  const board = { ...emptyBoard(), idea: [ideaItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockResolvedValue({ ok: true, item: { ...ideaItem, state: "drafting" } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const card = await screen.findByText("Idea title");
  fireEvent.click(card);
  await screen.findByText(ideaItem.angle);

  fireEvent.click(screen.getByText("Move to drafting"));

  await waitFor(() => {
    expect(postState).toHaveBeenCalledWith("example-agency", "idea-1", "drafting");
  });
  expect(screen.queryByText(ideaItem.angle)).toBeNull();
});

test("Move to drafting rejection shows the error text and keeps the popup open", async () => {
  const ideaItem = makeItem("idea-1", "idea", "Idea title");
  const board = { ...emptyBoard(), idea: [ideaItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockRejectedValue(new Error("network down"));

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const card = await screen.findByText("Idea title");
  fireEvent.click(card);
  await screen.findByText(ideaItem.angle);

  fireEvent.click(screen.getByText("Move to drafting"));

  expect(await screen.findByText("Action failed: network down")).toBeTruthy();
  expect(screen.getByText(ideaItem.angle)).toBeTruthy();
});

test("drag-drop rejection shows the error text", async () => {
  const draftingItem = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [draftingItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockRejectedValue(new Error("network down"));

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  await screen.findByText("Drafting title");

  const dataTransfer = {
    getData: (key: string) =>
      key === "application/x-item-id" ? "drafting-1" : "drafting",
  };
  const dropTarget = screen.getByText("In review").closest("div")!.nextSibling as Element;
  fireEvent.drop(dropTarget, { dataTransfer });

  expect(await screen.findByText("Action failed: network down")).toBeTruthy();
});
