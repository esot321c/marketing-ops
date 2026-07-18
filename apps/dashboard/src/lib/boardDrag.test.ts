import { test, expect } from "vitest";
import { dropArgs, reorderList, insertOrder } from "./boardDrag.js";

test("dropArgs no-ops when the card is dropped on its own column", () => {
  expect(dropArgs("idea", "idea", "2026-07-10")).toBeNull();
});

test("dropArgs defaults the date to today when moving to scheduled", () => {
  expect(dropArgs("approved", "scheduled", "2026-07-10")).toEqual({ to: "scheduled", date: "2026-07-10" });
});

test("dropArgs omits the date for non-scheduled targets", () => {
  expect(dropArgs("idea", "approved", "2026-07-10")).toEqual({ to: "approved" });
});

test("reorderList moves an entry earlier in the list", () => {
  expect(reorderList(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
});

test("reorderList moves an entry later in the list", () => {
  expect(reorderList(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
});

test("reorderList is a no-op when from equals to", () => {
  const order = ["a", "b", "c"];
  const next = reorderList(order, 1, 1);
  expect(next).toEqual(order);
  expect(next).not.toBe(order);
});

test("reorderList returns a copy unchanged for out-of-range indices", () => {
  const order = ["a", "b", "c"];
  expect(reorderList(order, -1, 1)).toEqual(order);
  expect(reorderList(order, 0, 9)).toEqual(order);
});

test("insertOrder takes the midpoint of two ordered neighbors", () => {
  expect(insertOrder({ order: 10 }, { order: 20 })).toBe(15);
});

test("insertOrder drops at the start of the column", () => {
  expect(insertOrder(null, { order: 20 })).toBe(20 - 1000);
});

test("insertOrder drops at the end of the column", () => {
  expect(insertOrder({ order: 20 }, null)).toBe(20 + 1000);
});

test("insertOrder falls back to zero when neither neighbor has an order", () => {
  expect(insertOrder({}, {})).toBe(0);
});

test("insertOrder anchors off the ordered neighbor when the other lacks one", () => {
  expect(insertOrder({ order: 5 }, {})).toBe(5 + 1000);
  expect(insertOrder({}, { order: 5 })).toBe(5 - 1000);
});
