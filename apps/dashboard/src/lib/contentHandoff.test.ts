import { test, expect } from "vitest";
import { contentInstruction, latestPendingRefineNote } from "./contentHandoff.js";

test("instructions name the action, tenant, and reference", () => {
  expect(contentInstruction("fulfil-request", "Example Tenant", "req_1"))
    .toBe('Fulfil content request "req_1" for Example Tenant');
  expect(contentInstruction("refine", "Example Tenant", "item_3"))
    .toBe('Refine content item "item_3" for Example Tenant. No refine note queued.');
  expect(contentInstruction("apply-learning", "Example Tenant", "L5"))
    .toBe('Apply learning "L5" for Example Tenant');
  expect(contentInstruction("draft-suggestion", "Example Tenant"))
    .toBe("Draft the next suggested content piece for Example Tenant");
});

test("refine instruction includes a queued note when present", () => {
  expect(contentInstruction("refine", "Example Tenant", "item_3", "tighten slide 3"))
    .toBe('Refine content item "item_3" for Example Tenant. Queued refine note: "tighten slide 3".');
});

test("refine instruction reports when no note is queued", () => {
  expect(contentInstruction("refine", "Example Tenant", "item_3", "   "))
    .toBe('Refine content item "item_3" for Example Tenant. No refine note queued.');
});

test("latestPendingRefineNote returns the last pending entry's instruction", () => {
  const log = [
    { instruction: "old note", summary: "applied: reworded" },
    { instruction: "newer note", summary: "pending" },
  ];
  expect(latestPendingRefineNote(log)).toBe("newer note");
});

test("latestPendingRefineNote returns undefined when nothing is pending", () => {
  expect(latestPendingRefineNote([{ instruction: "done", summary: "applied" }])).toBeUndefined();
  expect(latestPendingRefineNote([])).toBeUndefined();
});
