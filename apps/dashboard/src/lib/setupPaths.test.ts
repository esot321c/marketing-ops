import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { test, expect, beforeAll, afterAll } from "vitest";
import {
  isValidTenantId,
  dataRoot,
  sharedRoot,
  resolveTenantSetupDir,
  resolveSetupAssetPath,
  resolveContentDir,
  resolveContentItemPath,
  resolveContentAssetPath,
  resolveContentFile,
  resolveBoardPrefsFile,
  resolveWorkTypeDir,
  resolveWorkFile,
  resolveAnalyticsDir,
  resolveAnalyticsFile,
  resolveAnalyticsImportsDir,
  listTenantDirs,
} from "./setupPaths.js";

test("isValidTenantId accepts kebab ids and rejects unsafe ones", () => {
  expect(isValidTenantId("example-agency")).toBe(true);
  expect(isValidTenantId("example-saas")).toBe(true);
  expect(isValidTenantId("../etc")).toBe(false);
  expect(isValidTenantId("Example Agency")).toBe(false);
  expect(isValidTenantId("")).toBe(false);
});

test("resolveTenantSetupDir returns the tenant-first path and confines under data/", () => {
  const dir = resolveTenantSetupDir("example-agency");
  expect(dir).toBe(path.join(dataRoot, "example-agency", "setup"));
  expect(resolveTenantSetupDir("../escape")).toBeNull();
});

test("resolveSetupAssetPath rejects traversal in the filename", () => {
  const ok = resolveSetupAssetPath("example-agency", "logo.png");
  expect(ok).toBe(path.join(dataRoot, "example-agency", "setup", "assets", "logo.png"));
  expect(resolveSetupAssetPath("example-agency", "../../secret.png")).toBeNull();
  expect(resolveSetupAssetPath("example-agency", "nested/logo.png")).toBeNull();
});

test("resolveContentDir returns the tenant-first path and confines under data/", () => {
  const dir = resolveContentDir("example-personal");
  expect(dir).toBe(path.join(dataRoot, "example-personal", "content"));
  expect(resolveContentDir("../escape")).toBeNull();
});

test("resolveContentItemPath rejects id traversal and enforces one segment", () => {
  const ok = resolveContentItemPath("example-personal", "abc123");
  expect(ok).toBe(path.join(dataRoot, "example-personal", "content", "items", "abc123.json"));
  expect(resolveContentItemPath("example-personal", "../secret")).toBeNull();
  expect(resolveContentItemPath("example-personal", "nested/id")).toBeNull();
});

test("resolveContentAssetPath validates item id and asset filename", () => {
  const ok = resolveContentAssetPath("example-personal", "item1", "a1.png");
  expect(ok).toBe(path.join(dataRoot, "example-personal", "content", "assets", "item1", "a1.png"));
  expect(resolveContentAssetPath("example-personal", "item1", "../x.png")).toBeNull();
  expect(resolveContentAssetPath("example-personal", "../x", "a.png")).toBeNull();
});

test("resolveContentFile only allows known top-level files", () => {
  expect(resolveContentFile("example-personal", "cadence.json"))
    .toBe(path.join(dataRoot, "example-personal", "content", "cadence.json"));
  expect(resolveContentFile("example-personal", "learnings.jsonl"))
    .toBe(path.join(dataRoot, "example-personal", "content", "learnings.jsonl"));
  expect(resolveContentFile("example-personal", "../secret")).toBeNull();
  expect(resolveContentFile("example-personal", "nested/x.json")).toBeNull();
});

test("resolveBoardPrefsFile resolves board-prefs.json under the tenant content dir", () => {
  const file = resolveBoardPrefsFile("example-agency");
  expect(file).toBe(path.join(dataRoot, "example-agency", "content", "board-prefs.json"));
  expect(resolveBoardPrefsFile("../escape")).toBeNull();
  expect(resolveBoardPrefsFile("Bad Tenant")).toBeNull();
});

test("resolveWorkTypeDir confines under the tenant's work dir for a known capability", () => {
  const dir = resolveWorkTypeDir("example-agency", "campaigns");
  expect(dir).toBe(path.join(dataRoot, "example-agency", "work", "campaigns"));
});

test("resolveWorkFile resolves a slug to a markdown file under the work dir", () => {
  const file = resolveWorkFile("example-agency", "campaigns", "q3-push");
  expect(file).toBe(path.join(dataRoot, "example-agency", "work", "campaigns", "q3-push.md"));
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

test("resolveAnalyticsDir returns the tenant-first path and confines under data/", () => {
  const dir = resolveAnalyticsDir("example-agency");
  expect(dir).toBe(path.join(dataRoot, "example-agency", "analytics"));
  expect(resolveAnalyticsDir("../escape")).toBeNull();
});

test("resolveAnalyticsFile resolves to posts.json under the tenant analytics dir", () => {
  const file = resolveAnalyticsFile("example-agency");
  expect(file).toBe(path.join(dataRoot, "example-agency", "analytics", "posts.json"));
  expect(resolveAnalyticsFile("../escape")).toBeNull();
});

test("resolveAnalyticsImportsDir resolves under the tenant's analytics dir", () => {
  const dir = resolveAnalyticsImportsDir("example-agency");
  expect(dir).toBe(path.join(dataRoot, "example-agency", "analytics", "imports"));
  expect(resolveAnalyticsImportsDir("../escape")).toBeNull();
});

// listTenantDirs: discovery rule is "top-level dir under data/ containing a
// setup/ subdirectory"; data/shared and non-tenant dirs are ignored.
const discoveryTenants = ["discovery-tenant-a", "discovery-tenant-b"];

beforeAll(async () => {
  for (const t of discoveryTenants) {
    await mkdir(path.join(dataRoot, t, "setup"), { recursive: true });
  }
  await mkdir(path.join(dataRoot, "shared"), { recursive: true });
  await mkdir(path.join(dataRoot, "legacy-notes"), { recursive: true });
});

afterAll(async () => {
  for (const t of discoveryTenants) {
    await rm(path.join(dataRoot, t), { recursive: true, force: true });
  }
  await rm(path.join(dataRoot, "shared"), { recursive: true, force: true });
  await rm(path.join(dataRoot, "legacy-notes"), { recursive: true, force: true });
});

test("listTenantDirs finds tenants with a setup/ subdirectory", () => {
  const found = listTenantDirs();
  expect(found).toEqual(expect.arrayContaining(discoveryTenants));
});

test("listTenantDirs ignores data/shared and dirs without a setup/ subdirectory", () => {
  const found = listTenantDirs();
  expect(found).not.toContain("shared");
  expect(found).not.toContain("legacy-notes");
});

test("sharedRoot points at data/shared", () => {
  expect(sharedRoot).toBe(path.join(dataRoot, "shared"));
});
