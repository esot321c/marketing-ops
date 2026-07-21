import { test, expect } from "vitest";
import { parseTenantSummary } from "./tenantRegistry.js";

test("parseTenantSummary extracts id and name, tolerating partial files", () => {
  expect(parseTenantSummary({ id: "example-agency", name: "Example Agency", extra: 1 })).toEqual({
    id: "example-agency",
    name: "Example Agency",
  });
  expect(parseTenantSummary({ id: "example-saas" })).toEqual({ id: "example-saas", name: "example-saas" });
  expect(parseTenantSummary({ name: "no id" })).toBeNull();
});

test("parseTenantSummary includes domain when present as a string, omits it otherwise", () => {
  expect(parseTenantSummary({ id: "example-agency", name: "Example Agency", domain: "example-agency.dev" })).toEqual({
    id: "example-agency",
    name: "Example Agency",
    domain: "example-agency.dev",
  });
  expect(parseTenantSummary({ id: "example-saas", domain: 123 })).toEqual({
    id: "example-saas",
    name: "example-saas",
  });
});
