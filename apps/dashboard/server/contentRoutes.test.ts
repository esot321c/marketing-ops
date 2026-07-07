import { test, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { registerRoutes } from "./routes.js";
import { contentRoot } from "../src/lib/setupPaths.js";

const app = new Hono();
registerRoutes(app);
const dir = path.join(contentRoot, "example-agency");
// tenantExists() reads data/tenants/*.json (via listTenants), not data/setup or
// data/content — example-agency isn't registered locally, so register it here.
const tenantsRoot = path.resolve(process.cwd(), "..", "..", "data", "tenants");
const tenantFile = path.join(tenantsRoot, "example-agency.json");

beforeAll(async () => {
  await mkdir(path.join(dir, "items"), { recursive: true });
  await writeFile(path.join(dir, "items", "i1.json"), JSON.stringify({
    id: "i1", tenantId: "example-agency", channel: "linkedin", format: "text-post",
    state: "approved", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  await writeFile(path.join(dir, "cadence.json"), JSON.stringify({
    tenantId: "example-agency", perWeek: {}, engagement: "d", pillars: [], updatedBy: [],
  }));
  await mkdir(tenantsRoot, { recursive: true });
  await writeFile(tenantFile, JSON.stringify({ id: "example-agency", name: "Example Agency" }));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(tenantFile, { force: true });
});

test("GET board index groups the seeded item under its state", async () => {
  const res = await app.request("/api/content/example-agency");
  expect(res.status).toBe(200);
  const body = await res.json() as { approved: { id: string }[] };
  expect(body.approved[0]!.id).toBe("i1");
});

test("GET run-modes always includes chat", async () => {
  const res = await app.request("/api/content/example-agency/run-modes");
  const body = await res.json() as { modes: string[] };
  expect(body.modes).toContain("chat");
});

test("GET unknown tenant is 404", async () => {
  const res = await app.request("/api/content/not a tenant/today");
  expect(res.status).toBe(404);
});

test("GET cadence returns the seeded cadence for a tenant with known targets and pillars", async () => {
  const seededDir = path.join(contentRoot, "cadence-seeded-tenant");
  const seededTenantFile = path.join(tenantsRoot, "cadence-seeded-tenant.json");
  await mkdir(seededDir, { recursive: true });
  await writeFile(seededTenantFile, JSON.stringify({ id: "cadence-seeded-tenant", name: "Cadence Seeded Tenant" }));
  await writeFile(path.join(seededDir, "cadence.json"), JSON.stringify({
    tenantId: "cadence-seeded-tenant",
    perWeek: { "linkedin/carousel": 2, "blog/blog-post": 1 },
    engagement: "daily, comment on 3 in-lane posts",
    pillars: [{ name: "reliability", weight: 3 }],
    updatedBy: [],
  }));
  try {
    const res = await app.request("/api/content/cadence-seeded-tenant/cadence");
    expect(res.status).toBe(200);
    const body = await res.json() as { tenantId: string; perWeek: Record<string, number>; pillars: { name: string; weight: number }[] };
    expect(body.tenantId).toBe("cadence-seeded-tenant");
    expect(body.perWeek).toEqual({ "linkedin/carousel": 2, "blog/blog-post": 1 });
    expect(body.pillars).toEqual([{ name: "reliability", weight: 3 }]);
  } finally {
    await rm(seededDir, { recursive: true, force: true });
    await rm(seededTenantFile, { force: true });
  }
});

test("GET cadence for a tenant with no cadence.json returns the empty default", async () => {
  const noCadenceDir = path.join(contentRoot, "no-cadence-tenant");
  const noCadenceTenantFile = path.join(tenantsRoot, "no-cadence-tenant.json");
  await mkdir(noCadenceDir, { recursive: true });
  await writeFile(noCadenceTenantFile, JSON.stringify({ id: "no-cadence-tenant", name: "No Cadence Tenant" }));
  try {
    const res = await app.request("/api/content/no-cadence-tenant/cadence");
    expect(res.status).toBe(200);
    const body = await res.json() as { tenantId: string; perWeek: Record<string, number> };
    expect(body.tenantId).toBe("no-cadence-tenant");
    expect(body.perWeek).toEqual({});
  } finally {
    await rm(noCadenceDir, { recursive: true, force: true });
    await rm(noCadenceTenantFile, { force: true });
  }
});
