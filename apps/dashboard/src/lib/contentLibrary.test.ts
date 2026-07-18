import { test, expect } from "vitest";
import {
  parseItems, filterByState, boardIndex, activeCount, orderedColumn,
  PARKED_STATES, ALL_BOARD_STATES,
} from "./contentLibrary.js";
import type { ContentItem } from "./contentTypes.js";

function make(id: string, state: ContentItem["state"], order?: number): string {
  const item: ContentItem = {
    id, tenantId: "example-personal", channel: "linkedin", format: "text-post",
    state, title: id, angle: "reliability", pillar: "reliability",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
    ...(order === undefined ? {} : { order }),
  };
  return JSON.stringify(item);
}

function makeItem(id: string, order?: number): ContentItem {
  return {
    id, tenantId: "example-personal", channel: "linkedin", format: "text-post",
    state: "idea", title: id, angle: "reliability", pillar: "reliability",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
    ...(order === undefined ? {} : { order }),
  };
}

test("parseItems keeps valid items and drops malformed json/objects", () => {
  const items = parseItems([make("a", "idea"), "{not json", JSON.stringify({ id: "x" })]);
  expect(items.map((i) => i.id)).toEqual(["a"]);
});

test("filterByState returns only matching items", () => {
  const items = parseItems([make("a", "idea"), make("b", "approved")]);
  expect(filterByState(items, "approved").map((i) => i.id)).toEqual(["b"]);
});

test("boardIndex groups every state, empty arrays included", () => {
  const idx = boardIndex(parseItems([make("a", "idea"), make("b", "idea")]));
  expect(idx.idea.map((i) => i.id)).toEqual(["a", "b"]);
  expect(idx.approved).toEqual([]);
  expect(Object.keys(idx)).toEqual(ALL_BOARD_STATES);
});

test("PARKED_STATES and ALL_BOARD_STATES have exactly the expected contents", () => {
  expect(PARKED_STATES).toEqual(["needs_work", "parked"]);
  expect(ALL_BOARD_STATES).toEqual([
    "idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured",
    "needs_work", "parked",
  ]);
});

test("boardIndex places a needs_work item and a parked item into their own buckets without throwing", () => {
  expect(() => boardIndex(parseItems([
    make("a", "idea"), make("b", "needs_work"), make("c", "parked"),
  ]))).not.toThrow();

  const idx = boardIndex(parseItems([
    make("a", "idea"), make("b", "needs_work"), make("c", "parked"),
  ]));
  expect(idx.needs_work.map((i) => i.id)).toEqual(["b"]);
  expect(idx.parked.map((i) => i.id)).toEqual(["c"]);
  expect(idx.idea.map((i) => i.id)).toEqual(["a"]);
});

test("activeCount sums only BOARD_STATES, excluding needs_work and parked", () => {
  const idx = boardIndex(parseItems([
    make("a", "idea"), make("b", "approved"), make("c", "approved"),
    make("d", "needs_work"), make("e", "parked"),
  ]));
  expect(activeCount(idx)).toBe(3);
});

test("orderedColumn sorts items with a numeric order ascending", () => {
  const items = [makeItem("a", 3), makeItem("b", 1), makeItem("c", 2)];
  expect(orderedColumn(items).map((i) => i.id)).toEqual(["b", "c", "a"]);
});

test("orderedColumn places unordered items after ordered ones", () => {
  const items = [makeItem("a"), makeItem("b", 1), makeItem("c")];
  expect(orderedColumn(items).map((i) => i.id)).toEqual(["b", "a", "c"]);
});

test("orderedColumn breaks ties by id ascending, both for equal order and missing order", () => {
  const items = [makeItem("z", 1), makeItem("y", 1), makeItem("b"), makeItem("a")];
  expect(orderedColumn(items).map((i) => i.id)).toEqual(["y", "z", "a", "b"]);
});

test("orderedColumn does not mutate the input array", () => {
  const items = [makeItem("b", 2), makeItem("a", 1)];
  const copy = [...items];
  orderedColumn(items);
  expect(items).toEqual(copy);
});

test("boardIndex returns each bucket already ordered", () => {
  const idx = boardIndex(parseItems([
    make("c", "idea", 5), make("a", "idea"), make("b", "idea", 1),
  ]));
  expect(idx.idea.map((i) => i.id)).toEqual(["b", "c", "a"]);
});
