import { test, expect } from "vitest";
import { contentInstruction } from "./contentHandoff.js";

test("instructions name the action, tenant, and reference", () => {
  expect(contentInstruction("fulfil-request", "Example Tenant", "req_1"))
    .toBe('Fulfil content request "req_1" for Example Tenant');
  expect(contentInstruction("refine", "Example Tenant", "item_3"))
    .toBe('Refine content item "item_3" for Example Tenant');
  expect(contentInstruction("apply-learning", "Example Tenant", "L5"))
    .toBe('Apply learning "L5" for Example Tenant');
  expect(contentInstruction("draft-suggestion", "Example Tenant"))
    .toBe("Draft the next suggested content piece for Example Tenant");
});
