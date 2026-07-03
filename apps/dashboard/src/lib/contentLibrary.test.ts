import { test, expect } from "vitest";
import { parseItems, filterByState, boardIndex, BOARD_STATES } from "./contentLibrary.js";
import type { ContentItem } from "./contentTypes.js";

function make(id: string, state: ContentItem["state"]): string {
  const item: ContentItem = {
    id, tenantId: "example-personal", channel: "linkedin", format: "text-post",
    state, title: id, angle: "reliability", pillar: "reliability",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  };
  return JSON.stringify(item);
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
  expect(Object.keys(idx)).toEqual(BOARD_STATES);
});
