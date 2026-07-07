import path from "node:path";
import { test, expect } from "vitest";
import {
  isValidTenantId,
  setupRoot,
  resolveTenantSetupDir,
  resolveSetupAssetPath,
  contentRoot,
  resolveContentDir,
  resolveContentItemPath,
  resolveContentAssetPath,
  resolveContentFile,
  resolveWorkTypeDir,
  resolveWorkFile,
} from "./setupPaths.js";

test("isValidTenantId accepts kebab ids and rejects unsafe ones", () => {
  expect(isValidTenantId("example-agency")).toBe(true);
  expect(isValidTenantId("example-saas")).toBe(true);
  expect(isValidTenantId("../etc")).toBe(false);
  expect(isValidTenantId("Example Agency")).toBe(false);
  expect(isValidTenantId("")).toBe(false);
});

test("resolveTenantSetupDir confines under the setup root", () => {
  const dir = resolveTenantSetupDir("example-agency");
  expect(dir?.startsWith(setupRoot)).toBeTruthy();
  expect(resolveTenantSetupDir("../escape")).toBeNull();
});

test("resolveSetupAssetPath rejects traversal in the filename", () => {
  const ok = resolveSetupAssetPath("example-agency", "logo.png");
  expect(ok && ok.startsWith(setupRoot)).toBeTruthy();
  expect(resolveSetupAssetPath("example-agency", "../../secret.png")).toBeNull();
  expect(resolveSetupAssetPath("example-agency", "nested/logo.png")).toBeNull();
});

test("resolveContentDir confines under the content root", () => {
  const dir = resolveContentDir("example-personal");
  expect(dir?.startsWith(contentRoot)).toBeTruthy();
  expect(resolveContentDir("../escape")).toBeNull();
});

test("resolveContentItemPath rejects id traversal and enforces one segment", () => {
  const ok = resolveContentItemPath("example-personal", "abc123");
  expect(ok && ok.startsWith(contentRoot)).toBeTruthy();
  expect(resolveContentItemPath("example-personal", "../secret")).toBeNull();
  expect(resolveContentItemPath("example-personal", "nested/id")).toBeNull();
});

test("resolveContentAssetPath validates item id and asset filename", () => {
  const ok = resolveContentAssetPath("example-personal", "item1", "a1.png");
  expect(ok && ok.startsWith(contentRoot)).toBeTruthy();
  expect(resolveContentAssetPath("example-personal", "item1", "../x.png")).toBeNull();
  expect(resolveContentAssetPath("example-personal", "../x", "a.png")).toBeNull();
});

test("resolveContentFile only allows known top-level files", () => {
  expect(resolveContentFile("example-personal", "cadence.json")?.startsWith(contentRoot)).toBeTruthy();
  expect(resolveContentFile("example-personal", "learnings.jsonl")?.startsWith(contentRoot)).toBeTruthy();
  expect(resolveContentFile("example-personal", "../secret")).toBeNull();
  expect(resolveContentFile("example-personal", "nested/x.json")).toBeNull();
});

test("resolveWorkTypeDir confines under the work root for a known capability", () => {
  const dir = resolveWorkTypeDir("example-agency", "campaigns");
  expect(dir).not.toBeNull();
  expect(dir?.endsWith(path.join("work", "example-agency", "campaigns"))).toBeTruthy();
});

test("resolveWorkFile resolves a slug to a markdown file under the work dir", () => {
  const file = resolveWorkFile("example-agency", "campaigns", "q3-push");
  expect(file).not.toBeNull();
  expect(file?.endsWith("q3-push.md")).toBeTruthy();
});

test("resolveWorkTypeDir rejects an invalid tenant id", () => {
  expect(resolveWorkTypeDir("../x", "campaigns")).toBeNull();
});

test("resolveWorkTypeDir rejects an unknown capability type", () => {
  expect(resolveWorkTypeDir("example-agency", "bogus")).toBeNull();
});

test("resolveWorkFile rejects a traversal slug", () => {
  expect(resolveWorkFile("example-agency", "campaigns", "..")).toBeNull();
});

test("resolveWorkFile rejects a slug containing a path separator", () => {
  expect(resolveWorkFile("example-agency", "campaigns", "a/b")).toBeNull();
});
