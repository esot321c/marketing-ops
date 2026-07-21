// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PipelineBoard } from "./PipelineBoard.js";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, setItemOrder, duplicateItem, deleteItem } from "@/lib/api";
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
  duplicateItem: vi.fn(),
  deleteItem: vi.fn(),
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

test("dropping a ranked item into a gap between two legacy unordered neighbors keeps it ahead of them, not at the front of the column", async () => {
  // "a" and "b" are ranked; "x" and "y" are legacy items with no order, so
  // orderedColumn displays them trailing (sorted by id): a, b, x, y. Drag
  // "b" to the slot between "x" and "y". The old logic read its neighbors
  // off the pre-removal array once "b" is removed ([a, x, y]); both the
  // slot's immediate before ("x") and after ("y") are unranked, so it fell
  // back to a context-free 0, which is less than "a"'s order and jumped
  // "b" ahead of "a" instead of leaving it between the ranked prefix and
  // the unordered tail it was dropped into.
  const a = makeItem("a", "idea", "A", 10);
  const b = makeItem("b", "idea", "B", 20);
  const x = makeItem("x", "idea", "X");
  const y = makeItem("y", "idea", "Y");
  const board = { ...emptyBoard(), idea: [a, b, x, y] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(setItemOrder).mockResolvedValue({ ok: true, item: { ...b, order: 1010 } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("A");

  // Drop "b" into slot index 3, i.e. between "x" (index 2) and "y" (index 3).
  const dropSlot = screen.getByTestId("dropslot-idea-3");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "b" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await waitFor(() => {
    expect(setItemOrder).toHaveBeenCalled();
  });
  const [, , writtenOrder] = vi.mocked(setItemOrder).mock.calls[0]!;

  // Re-derive the displayed order the same way orderedColumn does, to
  // confirm "b" still sorts right after "a" (ranked items always precede
  // unranked ones, so it can never land strictly between "x" and "y", but
  // it must not jump ahead of "a" either).
  const rows = [
    { id: "a", order: 10 },
    { id: "b", order: writtenOrder as number },
    { id: "x", order: undefined },
    { id: "y", order: undefined },
  ].sort((p, q) => {
    const pOrdered = typeof p.order === "number";
    const qOrdered = typeof q.order === "number";
    if (pOrdered && qOrdered) return p.order! - q.order!;
    if (pOrdered !== qOrdered) return pOrdered ? -1 : 1;
    return p.id < q.id ? -1 : 1;
  });
  expect(rows.map((r) => r.id)).toEqual(["a", "b", "x", "y"]);
});

test("dropping an item in a column where no item has a stored order yet normalizes the whole column and lands the item at the dropped slot", async () => {
  // Every existing tenant board is in this state before its first reorder:
  // no item has an `order`, so orderedColumn displays them by id. Drag "a"
  // to the end; the resulting displayed order must be b, c, a, not a jump
  // to the front.
  const a = makeItem("a", "idea", "A");
  const b = makeItem("b", "idea", "B");
  const c = makeItem("c", "idea", "C");
  const board = { ...emptyBoard(), idea: [a, b, c] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(setItemOrder).mockImplementation(async (_tenant, id, order) =>
    ({ ok: true, item: { ...a, id, order } }));

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("A");

  const dropSlot = screen.getByTestId("dropslot-idea-3");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "a" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await waitFor(() => {
    expect(setItemOrder).toHaveBeenCalledTimes(3);
  });
  const writes = new Map(
    vi.mocked(setItemOrder).mock.calls.map(([, id, order]) => [id, order as number]),
  );
  const resorted = [
    { id: "a", order: writes.get("a") },
    { id: "b", order: writes.get("b") },
    { id: "c", order: writes.get("c") },
  ].sort((p, q) => p.order! - q.order!).map((r) => r.id);
  expect(resorted).toEqual(["b", "c", "a"]);
});

test("normalization write rejection on an all-unranked column shows the error text and refetches the board", async () => {
  // Same all-unranked setup as the normalization test above, but one of the
  // gap-spaced writes rejects. The other writes still target different item
  // files and should be attempted regardless, and the board must reload so
  // it reflects whatever mix of ranked/unranked items actually landed on disk.
  const a = makeItem("a", "idea", "A");
  const b = makeItem("b", "idea", "B");
  const c = makeItem("c", "idea", "C");
  const board = { ...emptyBoard(), idea: [a, b, c] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(setItemOrder).mockImplementation(async (_tenant, id, order) => {
    if (id === "b") throw new Error("disk full");
    return { ok: true, item: { ...a, id, order } };
  });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("A");

  const dropSlot = screen.getByTestId("dropslot-idea-3");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "a" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await waitFor(() => {
    expect(setItemOrder).toHaveBeenCalledTimes(3);
  });
  expect(await screen.findByText("Action failed: disk full")).toBeTruthy();
  await waitFor(() => {
    expect(getBoard).toHaveBeenCalledTimes(2);
  });
});

test("dropping an item back onto its own slot is a no-op and does not call setItemOrder", async () => {
  const first = makeItem("idea-1", "idea", "First idea", 10);
  const second = makeItem("idea-2", "idea", "Second idea", 20);
  const board = { ...emptyBoard(), idea: [first, second] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("First idea");

  // "Second idea" is already at index 1; dropping it on its own slot (index 1)
  // does not move it.
  const dropSlot = screen.getByTestId("dropslot-idea-1");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "idea-2" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  // Give any accidental async write a chance to fire before asserting absence.
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(setItemOrder).not.toHaveBeenCalled();
});

test("dropping a single-item column's only card on its own slot does not call setItemOrder", async () => {
  const only = makeItem("only-1", "idea", "Only idea", 10);
  const board = { ...emptyBoard(), idea: [only] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Only idea");

  const dropSlot = screen.getByTestId("dropslot-idea-0");
  const dataTransfer = {
    getData: (key: string) => (key === "application/x-item-id" ? "only-1" : "idea"),
  };
  fireEvent.drop(dropSlot, { dataTransfer });

  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(setItemOrder).not.toHaveBeenCalled();
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

test("clicking the card actions trigger opens the menu without navigating or opening the idea popup", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);
  await screen.findByText("Drafting title");

  const trigger = screen.getByLabelText("Card actions");
  fireEvent.click(trigger);

  expect(await screen.findByText("Open")).toBeTruthy();
  expect(onOpen).not.toHaveBeenCalled();
  expect(screen.queryByText(item.angle)).toBeNull();
});

test("Move to submenu lists every column except the current state; picking Parked calls postState", async () => {
  const item = makeItem("in-review-1", "in_review", "In review title");
  const board = { ...emptyBoard(), in_review: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockResolvedValue({ ok: true, item: { ...item, state: "parked" } });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("In review title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Move to"));

  const menu = (await screen.findByRole("button", { name: "Parked" })).closest<HTMLElement>(".ws-board-swatchmenu")!;
  expect(within(menu).queryByRole("button", { name: "In review" })).toBeNull();
  expect(within(menu).getByRole("button", { name: "Parked" })).toBeTruthy();
  expect(within(menu).getByRole("button", { name: "Ideas" })).toBeTruthy();

  fireEvent.click(within(menu).getByRole("button", { name: "Parked" }));

  await waitFor(() => {
    expect(postState).toHaveBeenCalledWith("example-agency", "in-review-1", "parked");
  });
  expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  expect(screen.queryByText("Duplicate")).toBeNull();
});

test("Duplicate calls duplicateItem and closes the menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(duplicateItem).mockResolvedValue({ ...item, id: "drafting-1-copy", state: "idea" });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Duplicate"));

  await waitFor(() => {
    expect(duplicateItem).toHaveBeenCalledWith("example-agency", "drafting-1");
  });
  expect(screen.queryByText("Duplicate")).toBeNull();
});

test("Delete requires an explicit confirm click before deleteItem is called", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(deleteItem).mockResolvedValue({ ok: true });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Delete"));

  expect(deleteItem).not.toHaveBeenCalled();
  const confirmButton = await screen.findByText("Confirm");
  fireEvent.click(confirmButton);

  await waitFor(() => {
    expect(deleteItem).toHaveBeenCalledWith("example-agency", "drafting-1");
  });
});

test("Cancel on the delete confirm returns to the menu without deleting", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Delete"));
  fireEvent.click(await screen.findByText("Cancel"));

  expect(deleteItem).not.toHaveBeenCalled();
  expect(await screen.findByText("Open")).toBeTruthy();
});

test("clicking outside the menu closes it", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  await screen.findByText("Open");

  fireEvent.mouseDown(document.body);

  await waitFor(() => {
    expect(screen.queryByText("Open")).toBeNull();
  });
});

test("Escape closes the card action menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  await screen.findByText("Open");

  fireEvent.keyDown(document, { key: "Escape" });

  await waitFor(() => {
    expect(screen.queryByText("Open")).toBeNull();
  });
});

test("Open menu item calls onOpen with the item id and closes the menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);
  await screen.findByText("Drafting title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Open"));

  expect(onOpen).toHaveBeenCalledWith("drafting-1");
});

test("a Move to postState rejection shows the board action error", async () => {
  const item = makeItem("in-review-1", "in_review", "In review title");
  const board = { ...emptyBoard(), in_review: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockRejectedValue(new Error("network down"));

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("In review title");

  fireEvent.click(screen.getByLabelText("Card actions"));
  fireEvent.click(await screen.findByText("Move to"));
  fireEvent.click(screen.getByRole("button", { name: "Parked" }));

  expect(await screen.findByText("Action failed: network down")).toBeTruthy();
});
