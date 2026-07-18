import { test, expect } from "vitest";
import { effectiveFormat, gateFor, isItemReady, validateContentItem } from "./contentTypes.js";
import type { Asset, ContentItem } from "./contentTypes.js";

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

test("validateContentItem accepts channel x", () => {
  expect(validateContentItem({ ...item, channel: "x" })).toBe(true);
});

test("validateContentItem accepts the needs_work and parked states", () => {
  expect(validateContentItem({ ...item, state: "needs_work" })).toBe(true);
  expect(validateContentItem({ ...item, state: "parked" })).toBe(true);
});

test("validateContentItem accepts an optional string caption", () => {
  expect(validateContentItem({ ...item, caption: "The post body" })).toBe(true);
  expect(validateContentItem({ ...item, caption: undefined })).toBe(true);
});

test("validateContentItem rejects a non-string caption", () => {
  expect(validateContentItem({ ...item, caption: 42 })).toBe(false);
});

test("validateContentItem accepts a well-formed citations array", () => {
  expect(validateContentItem({ ...item, citations: [{ label: "A study", url: "https://example.com/s" }] })).toBe(true);
  expect(validateContentItem({ ...item, citations: [] })).toBe(true);
  expect(validateContentItem({ ...item, citations: undefined })).toBe(true);
});

test("validateContentItem rejects a malformed citations array", () => {
  expect(validateContentItem({ ...item, citations: "nope" })).toBe(false);
  expect(validateContentItem({ ...item, citations: [{ label: "x" }] })).toBe(false);
  expect(validateContentItem({ ...item, citations: [{ label: 1, url: "u" }] })).toBe(false);
});

test("validateContentItem accepts slides with bullets and visual", () => {
  expect(validateContentItem({
    ...item,
    format: "carousel",
    assets: [{
      id: "copy", kind: "copy", route: "local-harness", status: "ready",
      content: { type: "slides", slides: [
        { heading: "H1", body: "A lead-in sentence.", bullets: ["First item", "Second item"], visual: "numbered checklist" },
        { heading: "H2", dark: true },
      ] },
    }],
  })).toBe(true);
});

test("validateContentItem rejects malformed slides", () => {
  const withSlides = (slides: unknown) => ({
    ...item,
    assets: [{ id: "c", kind: "copy", route: "local-harness", status: "ready", content: { type: "slides", slides } }],
  });
  expect(validateContentItem(withSlides([{ heading: 1 }]))).toBe(false);
  expect(validateContentItem(withSlides([{ heading: "H", bullets: "nope" }]))).toBe(false);
  expect(validateContentItem(withSlides([{ heading: "H", bullets: [""] }]))).toBe(false);
  expect(validateContentItem(withSlides([{ heading: "H", visual: 3 }]))).toBe(false);
  expect(validateContentItem(withSlides("nope"))).toBe(false);
});

test("effectiveFormat: text-post with only a copy asset stays text-post", () => {
  expect(effectiveFormat(item)).toBe("text-post");
});

test("effectiveFormat: text-post with a copy asset plus an image asset is image-post", () => {
  const imageAsset: Asset = { id: "a2", kind: "image", route: "external-tool", status: "needed" };
  const withImage: ContentItem = { ...item, assets: [...item.assets, imageAsset] };
  expect(effectiveFormat(withImage)).toBe("image-post");
});

test("effectiveFormat: carousel stays carousel", () => {
  expect(effectiveFormat({ ...item, format: "carousel" })).toBe("carousel");
});

test("effectiveFormat: short-video stays short-video", () => {
  expect(effectiveFormat({ ...item, format: "short-video" })).toBe("short-video");
});

test("effectiveFormat: image-post format with no image asset yet stays image-post", () => {
  expect(effectiveFormat({ ...item, format: "image-post" })).toBe("image-post");
});

test("validateContentItem checks image package treatment and slidePrompts", () => {
  const withPackage = (extra: Record<string, unknown>) => ({
    ...item,
    assets: [{ id: "v", kind: "carousel-visual", route: "external-tool", status: "needed",
      package: { kind: "image", prompt: "deck style", ...extra } }],
  });
  expect(validateContentItem(withPackage({}))).toBe(true);
  expect(validateContentItem(withPackage({ treatment: "infographic", slidePrompts: [{ slide: 1, prompt: "p" }] }))).toBe(true);
  expect(validateContentItem(withPackage({ treatment: "text-on-art" }))).toBe(true);
  expect(validateContentItem(withPackage({ treatment: "collage" }))).toBe(false);
  expect(validateContentItem(withPackage({ slidePrompts: [{ slide: 0, prompt: "p" }] }))).toBe(false);
  expect(validateContentItem(withPackage({ slidePrompts: [{ prompt: "p" }] }))).toBe(false);
  expect(validateContentItem(withPackage({ slidePrompts: "nope" }))).toBe(false);
});
