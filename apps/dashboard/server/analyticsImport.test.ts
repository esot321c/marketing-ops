import { test, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import ExcelJS from "exceljs";
import { mkdir, rm, writeFile, readdir, utimes } from "node:fs/promises";
import path from "node:path";
import { importXlsxFile, watchTenantImports } from "./analyticsImport.js";
import { readAnalytics } from "./analyticsStore.js";
import { dataRoot, resolveAnalyticsDir, resolveAnalyticsImportsDir, resolveContentDir } from "../src/lib/setupPaths.js";

const tenant = "import-test-agency";
const importsDir = resolveAnalyticsImportsDir(tenant)!;
const tenantAnalyticsDir = resolveAnalyticsDir(tenant)!;
const tenantContentDir = resolveContentDir(tenant)!;
const tenantRoot = path.join(dataRoot, tenant);

const POST_URL =
  "https://www.linkedin.com/posts/example-agency_why-shipping-beats-polishing-ugcPost-1000000000000000001-Ab3d";

async function buildWorkbookBuffer(rows: [string, string?, string?][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Post analytics");
  for (const row of rows) sheet.addRow(row);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function validRows(postUrl: string = POST_URL): [string, string?, string?][] {
  return [
    ["Post URL", postUrl],
    ["Post Date", "7/16/2026"],
    ["Impressions", "500"],
    ["Reactions", "40"],
  ];
}

beforeAll(async () => {
  await mkdir(importsDir, { recursive: true });
});

afterEach(async () => {
  // importsDir is nested under tenantAnalyticsDir in the tenant-first layout,
  // so the tenant analytics dir must be cleared before recreating importsDir.
  await rm(tenantAnalyticsDir, { recursive: true, force: true });
  await mkdir(importsDir, { recursive: true });
  await rm(tenantContentDir, { recursive: true, force: true });
});

afterAll(async () => {
  await rm(tenantRoot, { recursive: true, force: true });
});

test("importXlsxFile writes a capture using the file's mtime and moves the file to processed/", async () => {
  const filePath = path.join(importsDir, "export.xlsx");
  await writeFile(filePath, await buildWorkbookBuffer(validRows()));
  const mtime = new Date("2026-07-16T08:00:00.000Z");
  await utimes(filePath, mtime, mtime);

  const result = await importXlsxFile(tenant, filePath);
  expect(result.deduped).toBe(false);

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  const post = data.posts[0]!;
  expect(post.urn).toBe("ugcPost-1000000000000000001");
  expect(post.captures[0]?.capturedAt).toBe(mtime.toISOString());
  expect(post.captures[0]?.source).toBe("xlsx-import");
  expect(post.captures[0]?.impressions).toBe(500);
  expect(post.channel).toBe("linkedin");

  const remaining = await readdir(importsDir);
  expect(remaining).not.toContain("export.xlsx");
  const processed = await readdir(path.join(importsDir, "processed"));
  expect(processed).toContain("export.xlsx");
});

test("a corrupt file is moved to failed/ and the store is left untouched", async () => {
  const filePath = path.join(importsDir, "corrupt.xlsx");
  await writeFile(filePath, "not a real xlsx file");

  await expect(importXlsxFile(tenant, filePath)).rejects.toThrow();

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(0);

  const remaining = await readdir(importsDir);
  expect(remaining).not.toContain("corrupt.xlsx");
  const failed = await readdir(path.join(importsDir, "failed"));
  expect(failed).toContain("corrupt.xlsx");
});

test("re-importing a twin file with identical data dedupes", async () => {
  const filePath1 = path.join(importsDir, "export1.xlsx");
  await writeFile(filePath1, await buildWorkbookBuffer(validRows()));
  const mtime = new Date("2026-07-16T08:00:00.000Z");
  await utimes(filePath1, mtime, mtime);
  await importXlsxFile(tenant, filePath1);

  const filePath2 = path.join(importsDir, "export2.xlsx");
  await writeFile(filePath2, await buildWorkbookBuffer(validRows()));
  const mtime2 = new Date("2026-07-16T08:30:00.000Z");
  await utimes(filePath2, mtime2, mtime2);
  const result = await importXlsxFile(tenant, filePath2);

  expect(result.deduped).toBe(true);
  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]?.captures).toHaveLength(1);
});

test("proposes itemId by normalized-prefix match against a single content item", async () => {
  await mkdir(path.join(tenantContentDir, "items"), { recursive: true });
  await writeFile(
    path.join(tenantContentDir, "items", "match.json"),
    JSON.stringify({
      id: "match",
      tenantId: tenant,
      channel: "linkedin",
      format: "text-post",
      state: "posted",
      title: "Why Shipping Beats Polishing Every Time",
      angle: "a",
      pillar: "p",
      assets: [],
      schedule: { status: "unscheduled" },
      source: [],
      refineLog: [],
    })
  );

  const filePath = path.join(importsDir, "export.xlsx");
  await writeFile(filePath, await buildWorkbookBuffer(validRows()));

  await importXlsxFile(tenant, filePath);

  const data = await readAnalytics(tenant);
  expect(data.posts[0]?.itemId).toBe("match");
});

const SHORT_SLUG_URL =
  "https://www.linkedin.com/posts/example-agency_ai-ethics-in-marketing-today-ugcPost-1000000000000000001-Ab3d";

const RUNS_PAST_HEADLINE_URL =
  "https://www.linkedin.com/posts/example-agency_marketing-automation-guide-for-busy-founders-ugcPost-1000000000000000001-Ab3d";

async function writeContentItem(title: string): Promise<void> {
  await mkdir(path.join(tenantContentDir, "items"), { recursive: true });
  await writeFile(
    path.join(tenantContentDir, "items", "match.json"),
    JSON.stringify({
      id: "match",
      tenantId: tenant,
      channel: "linkedin",
      format: "text-post",
      state: "posted",
      title,
      angle: "a",
      pillar: "p",
      assets: [],
      schedule: { status: "unscheduled" },
      source: [],
      refineLog: [],
    })
  );
}

test("does not propose an itemId when the title is too short to guard against a false prefix match", async () => {
  await writeContentItem("AI");

  const filePath = path.join(importsDir, "export.xlsx");
  await writeFile(filePath, await buildWorkbookBuffer(validRows(SHORT_SLUG_URL)));

  await importXlsxFile(tenant, filePath);

  const data = await readAnalytics(tenant);
  expect(data.posts[0]?.itemId).toBeUndefined();
});

test("proposes itemId when a long-enough headline is a prefix of the slug", async () => {
  await writeContentItem("Marketing Automation Guide");

  const filePath = path.join(importsDir, "export.xlsx");
  await writeFile(filePath, await buildWorkbookBuffer(validRows(RUNS_PAST_HEADLINE_URL)));

  await importXlsxFile(tenant, filePath);

  const data = await readAnalytics(tenant);
  expect(data.posts[0]?.itemId).toBe("match");
});

test("proposes itemId when the slug is a prefix of a long headline (existing behavior)", async () => {
  await writeContentItem("Why Shipping Beats Polishing Every Time");

  const filePath = path.join(importsDir, "export.xlsx");
  await writeFile(filePath, await buildWorkbookBuffer(validRows()));

  await importXlsxFile(tenant, filePath);

  const data = await readAnalytics(tenant);
  expect(data.posts[0]?.itemId).toBe("match");
});

test("watchTenantImports registers a callback for the tenant's imports dir", () => {
  const registerWatcher = vi.fn();
  watchTenantImports(tenant, registerWatcher);
  expect(registerWatcher).toHaveBeenCalledTimes(1);
  const [dir, onFile] = registerWatcher.mock.calls[0]!;
  expect(dir).toBe(importsDir);
  expect(typeof onFile).toBe("function");
});

test("watchTenantImports is a no-op for an invalid tenant id", () => {
  const registerWatcher = vi.fn();
  watchTenantImports("../escape", registerWatcher);
  expect(registerWatcher).not.toHaveBeenCalled();
});
