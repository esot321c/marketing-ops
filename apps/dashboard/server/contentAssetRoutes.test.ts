import { test, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { registerRoutes } from "./routes.js";
import { dataRoot, resolveContentDir } from "../src/lib/setupPaths.js";

const app = new Hono();
registerRoutes(app);
const dir = resolveContentDir("asset-test-agency")!;
// tenantExists() reads data/tenants/*.json (via listTenants); register the test tenant.
const tenantsRoot = path.resolve(process.cwd(), "..", "..", "data", "tenants");
const tenantFile = path.join(tenantsRoot, "asset-test-agency.json");

beforeAll(async () => {
  await mkdir(dir, { recursive: true });
  await mkdir(tenantsRoot, { recursive: true });
  await writeFile(tenantFile, JSON.stringify({ id: "asset-test-agency", name: "Asset Test Agency" }));
});
afterAll(async () => {
  await rm(path.join(dataRoot, "asset-test-agency"), { recursive: true, force: true });
  await rm(tenantFile, { force: true });
});

test("GET assets returns an empty list when nothing was uploaded", async () => {
  const res = await app.request("/api/content/asset-test-agency/item-empty/assets");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});

test("upload, list, and serve a slide image round-trips", async () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const form = new FormData();
  form.append("file", new File([bytes], "slide-01.png", { type: "image/png" }));
  const up = await app.request("/api/content/asset-test-agency/item1/assets/visual/upload", {
    method: "POST", body: form,
  });
  expect(up.status).toBe(200);

  const list = await app.request("/api/content/asset-test-agency/item1/assets");
  expect(await list.json()).toEqual(["slide-01.png"]);

  const img = await app.request("/api/content/asset-test-agency/item1/assets/slide-01.png");
  expect(img.status).toBe(200);
  expect(img.headers.get("content-type")).toContain("image/png");
  expect(new Uint8Array(await img.arrayBuffer())).toEqual(bytes);
});

test("GET a missing file is 404 and an unsupported extension is 400", async () => {
  const missing = await app.request("/api/content/asset-test-agency/item1/assets/slide-99.png");
  expect(missing.status).toBe(404);
  const exe = await app.request("/api/content/asset-test-agency/item1/assets/slide-01.exe");
  expect(exe.status).toBe(400);
});

test("GET rejects path traversal in the file segment", async () => {
  const res = await app.request("/api/content/asset-test-agency/item1/assets/..%2Fitems%2Fx.json");
  expect(res.status).not.toBe(200);
});

test("GET assets for an unknown tenant is 404", async () => {
  const res = await app.request("/api/content/nope-nope/item1/assets");
  expect(res.status).toBe(404);
});
