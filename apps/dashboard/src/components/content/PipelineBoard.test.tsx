// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PipelineBoard } from "./PipelineBoard.js";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, setItemOrder } from "@/lib/api";
import { ALL_BOARD_STATES } from "@/lib/contentLibrary";
import type { ContentItem, ContentState } from "@/lib/contentTypes";

class MockEventSource { addEventListener() {} close() {} }
// @ts-expect-error test stub
globalThis.EventSource = MockEventSource;

vi.mock("@/lib/api", () => ({
  getBoard: vi.fn(),
  getBoardPrefs: vi.fn(),
  setBoardPrefs: vi.fn(),
  setItemOrder: vi.fn(),
  postState: vi.fn(),
  getItem: vi.fn(),
}));

function makeItem(id: string, state: ContentState, title: string, order?: number): ContentItem {
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
    ...(order === undefined ? {} : { order }),
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
    needs_work: [],
    parked: [],
  };
}

function defaultPrefs() {
  return { columnOrder: ALL_BOARD_STATES, columnColors: {} };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBoardPrefs).mockResolvedValue(defaultPrefs());
});

test("renders all nine columns including Needs work and Parked in saved order", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());
  vi.mocked(getBoardPrefs).mockResolvedValue({
    columnOrder: ["parked", "needs_work", "idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured"],
    columnColors: {},
  });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const headings = await screen.findAllByText(/Ideas|Drafting|In review|Approved|Scheduled|Posted|Measured|Needs work|Parked/);
  expect(headings.map((h) => h.textContent)).toEqual([
    "Parked", "Needs work", "Ideas", "Drafting", "In review", "Approved", "Scheduled", "Posted", "Measured",
  ]);
});

test("a column header shows the color dot for its saved color", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());
  vi.mocked(getBoardPrefs).mockResolvedValue({
    columnOrder: ALL_BOARD_STATES,
    columnColors: { parked: "purple" },
  });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const dot = await screen.findByLabelText("Color for Parked");
  expect(dot.getAttribute("style")).toContain("--color-purple-500");
});

test("picking a color from the swatch menu persists via setBoardPrefs", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());
  vi.mocked(getBoardPrefs).mockResolvedValue(defaultPrefs());
  vi.mocked(setBoardPrefs).mockResolvedValue({ columnOrder: ALL_BOARD_STATES, columnColors: { idea: "green" } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const dot = await screen.findByLabelText("Color for Ideas");
  fireEvent.click(dot);
  const greenSwatch = await screen.findByLabelText("green");
  fireEvent.click(greenSwatch);

  await waitFor(() => {
    expect(setBoardPrefs).toHaveBeenCalledWith("example-agency", {
      columnOrder: ALL_BOARD_STATES,
      columnColors: { idea: "green" },
    });
  });
});

test("dragging a column header and dropping on another persists the new order", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());
  vi.mocked(getBoardPrefs).mockResolvedValue(defaultPrefs());
  vi.mocked(setBoardPrefs).mockResolvedValue(defaultPrefs());

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  const ideasHead = (await screen.findByText("Ideas")).closest(".ws-board-colhead")!;
  const measuredHead = (await screen.findByText("Measured")).closest(".ws-board-colhead")!;

  const dataTransfer = {
    setData: () => undefined,
    getData: () => "idea",
  };
  fireEvent.dragStart(ideasHead, { dataTransfer });
  fireEvent.dragOver(measuredHead, { dataTransfer });
  fireEvent.drop(measuredHead, { dataTransfer });

  await waitFor(() => {
    expect(setBoardPrefs).toHaveBeenCalled();
  });
  const [, savedPrefs] = vi.mocked(setBoardPrefs).mock.calls[0]!;
  expect(savedPrefs.columnOrder.includes("idea")).toBe(true);
  expect(savedPrefs.columnOrder.indexOf("idea")).toBeGreaterThan(savedPrefs.columnOrder.indexOf("drafting"));
});

test("dropping an item within its own column calls setItemOrder, not postState", async () => {
  const first = makeItem("idea-1", "idea", "First idea", 10);
  const second = makeItem("idea-2", "idea", "Second idea", 20);
  const board = { ...emptyBoard(), idea: [first, second] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(setItemOrder).mockResolvedValue({ ok: true, item: { ...first, order: 25 } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("First idea");

  // Move "First idea" (order 10) to the end of the column, after "Second idea" (order 20).
  const dropSlot = screen.getByTestId("dropslot-idea-2");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "idea-1" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await waitFor(() => {
    expect(setItemOrder).toHaveBeenCalledWith("example-agency", "idea-1", 1020);
  });
  expect(postState).not.toHaveBeenCalled();
});

test("dropping an item across columns still calls postState", async () => {
  const draftingItem = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [draftingItem] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockResolvedValue({ ok: true, item: { ...draftingItem, state: "in_review" } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  const dropSlot = screen.getByTestId("dropslot-in_review-0");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "drafting-1" : "drafting"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await waitFor(() => {
    expect(postState).toHaveBeenCalledWith("example-agency", "drafting-1", "in_review", undefined);
  });
  expect(setItemOrder).not.toHaveBeenCalled();
});

test("the board wrapper scrolls horizontally and column bodies scroll vertically", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());

  const { container } = render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Ideas");

  expect(container.querySelector(".ws-board-scroll")).toBeTruthy();
  expect(container.querySelectorAll(".ws-board-colbody").length).toBe(9);
});

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

  const dropSlot = screen.getByTestId("dropslot-in_review-0");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "drafting-1" : "drafting"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  expect(await screen.findByText("Action failed: network down")).toBeTruthy();
});
