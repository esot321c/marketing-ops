import { test, expect } from "vitest";
import { gateFor, isItemReady, validateContentItem } from "./contentTypes.js";
import type { ContentItem } from "./contentTypes.js";

const item: ContentItem = {
  id: "i1", tenantId: "example-personal", channel: "linkedin", format: "text-post",
  state: "in_review", title: "T", angle: "reliability", pillar: "reliability",
  assets: [{ id: "a1", kind: "copy", route: "local-harness", status: "ready",
    content: { type: "copy", copy: { headline: "H", body: "B" } } }],
  schedule: { status: "unscheduled" }, source: [], refineLog: [],
};

test("gateFor: only cadence auto-applies", () => {
  expect(gateFor("cadence")).toBe("auto");
  expect(gateFor("voice")).toBe("gated");
  expect(gateFor("profile")).toBe("gated");
});

test("isItemReady is true only when every asset is ready", () => {
  expect(isItemReady(item)).toBe(true);
  const pending: ContentItem = { ...item, assets: [{ ...item.assets[0]!, status: "needed" }] };
  expect(isItemReady(pending)).toBe(false);
  expect(isItemReady({ ...item, assets: [] })).toBe(false);
});

test("validateContentItem rejects malformed input", () => {
  expect(validateContentItem(item)).toBe(true);
  expect(validateContentItem(null)).toBe(false);
  expect(validateContentItem({ ...item, assets: "nope" })).toBe(false);
  expect(validateContentItem({ ...item, state: "bogus" })).toBe(false);
  expect(validateContentItem({ ...item, channel: "bogus" })).toBe(false);
  expect(validateContentItem({ ...item, format: "bogus" })).toBe(false);
  expect(validateContentItem({ ...item, schedule: { status: "bogus" } })).toBe(false);
  expect(validateContentItem({ ...item, assets: [{}] })).toBe(false);
  expect(validateContentItem({
    ...item,
    assets: [{ id: "a1", kind: "copy", route: "local-harness", status: "ready" }],
  })).toBe(true);
});

test("validateContentItem accepts an optional string caption", () => {
  expect(validateContentItem({ ...item, caption: "The post body" })).toBe(true);
  expect(validateContentItem({ ...item, caption: undefined })).toBe(true);
});

test("validateContentItem rejects a non-string caption", () => {
  expect(validateContentItem({ ...item, caption: 42 })).toBe(false);
});
