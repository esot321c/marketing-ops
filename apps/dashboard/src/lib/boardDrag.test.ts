import { test, expect } from "vitest";
import { dropArgs } from "./boardDrag.js";

test("dropArgs no-ops when the card is dropped on its own column", () => {
  expect(dropArgs("idea", "idea", "2026-07-10")).toBeNull();
});

test("dropArgs defaults the date to today when moving to scheduled", () => {
  expect(dropArgs("approved", "scheduled", "2026-07-10")).toEqual({ to: "scheduled", date: "2026-07-10" });
});

test("dropArgs omits the date for non-scheduled targets", () => {
  expect(dropArgs("idea", "approved", "2026-07-10")).toEqual({ to: "approved" });
});
