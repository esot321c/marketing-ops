// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PipelineBoard } from "./PipelineBoard.js";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, duplicateItem, deleteItem } from "@/lib/api";
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

// Radix's DropdownMenuTrigger opens on pointerdown, not on a bare click event,
// so jsdom interactions need the pointerdown fired first.
function openCardMenu() {
  const trigger = screen.getByLabelText("Card actions");
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 });
  fireEvent.click(trigger);
}

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

test("the board wrapper scrolls horizontally and column bodies scroll vertically", async () => {
  vi.mocked(getBoard).mockResolvedValue(emptyBoard());

  const { container } = render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Ideas");

  expect(container.querySelector(".ws-board-scroll")).toBeTruthy();
  expect(container.querySelectorAll(".ws-board-colbody").length).toBe(9);
});

test("a card shows its channel label next to the format pill", async () => {
  const xItem = makeItem("x-1", "drafting", "X post title");
  xItem.channel = "x";
  const board = { ...emptyBoard(), drafting: [xItem] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  await screen.findByText("X post title");
  expect(screen.getByText("X")).toBeTruthy();
});

test("a blog card falls back to the Blog label with no domain wired through", async () => {
  const blogItem = makeItem("blog-1", "drafting", "Blog post title");
  blogItem.channel = "blog";
  blogItem.format = "blog-post";
  const board = { ...emptyBoard(), drafting: [blogItem] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);

  await screen.findByText("Blog post title");
  expect(screen.getByText("Blog")).toBeTruthy();
});

test("a blog card shows the tenant's site domain when one is wired through", async () => {
  const blogItem = makeItem("blog-1", "drafting", "Blog post title");
  blogItem.channel = "blog";
  blogItem.format = "blog-post";
  const board = { ...emptyBoard(), drafting: [blogItem] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" siteDomain="example-agency.dev" onOpen={() => undefined} />);

  await screen.findByText("Blog post title");
  expect(screen.getByText("example-agency.dev")).toBeTruthy();
  expect(screen.queryByText("Blog")).toBeNull();
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

test("clicking the card actions trigger opens the menu without navigating or opening the idea popup", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);
  await screen.findByText("Drafting title");

  openCardMenu();

  expect(await screen.findByRole("menuitem", { name: "Open" })).toBeTruthy();
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

  openCardMenu();
  fireEvent.click(await screen.findByText("Move to"));

  expect(await screen.findByRole("menuitem", { name: "Parked" })).toBeTruthy();
  expect(screen.queryByRole("menuitem", { name: "In review" })).toBeNull();
  expect(screen.getByRole("menuitem", { name: "Ideas" })).toBeTruthy();

  fireEvent.click(screen.getByRole("menuitem", { name: "Parked" }));

  await waitFor(() => {
    expect(postState).toHaveBeenCalledWith("example-agency", "in-review-1", "parked");
  });
  await waitFor(() => {
    expect(screen.queryByRole("menuitem", { name: "Confirm" })).toBeNull();
  });
  expect(screen.queryByText("Duplicate")).toBeNull();
});

test("Duplicate calls duplicateItem and closes the menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(duplicateItem).mockResolvedValue({ ...item, id: "drafting-1-copy", state: "idea" });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  openCardMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));

  await waitFor(() => {
    expect(duplicateItem).toHaveBeenCalledWith("example-agency", "drafting-1");
  });
  await waitFor(() => {
    expect(screen.queryByRole("menuitem", { name: "Duplicate" })).toBeNull();
  });
});

test("Delete requires an explicit confirm click before deleteItem is called", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(deleteItem).mockResolvedValue({ ok: true });

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  openCardMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

  expect(deleteItem).not.toHaveBeenCalled();
  const confirmButton = await screen.findByRole("menuitem", { name: "Confirm" });
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

  openCardMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Cancel" }));

  expect(deleteItem).not.toHaveBeenCalled();
  expect(await screen.findByRole("menuitem", { name: "Open" })).toBeTruthy();
});

test("clicking outside the menu closes it", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  openCardMenu();
  await screen.findByRole("menuitem", { name: "Open" });

  fireEvent.pointerDown(document.body);
  fireEvent.mouseDown(document.body);

  await waitFor(() => {
    expect(screen.queryByRole("menuitem", { name: "Open" })).toBeNull();
  });
});

test("Escape closes the card action menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("Drafting title");

  openCardMenu();
  const menuItem = await screen.findByRole("menuitem", { name: "Open" });

  fireEvent.keyDown(menuItem, { key: "Escape" });

  await waitFor(() => {
    expect(screen.queryByRole("menuitem", { name: "Open" })).toBeNull();
  });
});

test("Open menu item calls onOpen with the item id and closes the menu", async () => {
  const item = makeItem("drafting-1", "drafting", "Drafting title");
  const board = { ...emptyBoard(), drafting: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  const onOpen = vi.fn();

  render(<PipelineBoard tenant="example-agency" onOpen={onOpen} />);
  await screen.findByText("Drafting title");

  openCardMenu();
  fireEvent.click(await screen.findByRole("menuitem", { name: "Open" }));

  expect(onOpen).toHaveBeenCalledWith("drafting-1");
});

test("a Move to postState rejection shows the board action error", async () => {
  const item = makeItem("in-review-1", "in_review", "In review title");
  const board = { ...emptyBoard(), in_review: [item] };
  vi.mocked(getBoard).mockResolvedValue(board);
  vi.mocked(postState).mockRejectedValue(new Error("network down"));

  render(<PipelineBoard tenant="example-agency" onOpen={() => undefined} />);
  await screen.findByText("In review title");

  openCardMenu();
  fireEvent.click(await screen.findByText("Move to"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Parked" }));

  expect(await screen.findByText("Action failed: network down")).toBeTruthy();
});
