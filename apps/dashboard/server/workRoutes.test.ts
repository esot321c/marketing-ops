import { test, expect, describe, it, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { registerWorkRoutes, parseFrontmatter, rewriteStatus } from "./workRoutes.js";
import { workRoot } from "../src/lib/setupPaths.js";

const app = new Hono();
registerWorkRoutes(app);

const tenant = "work-test-agency";
const campaignsDir = path.join(workRoot, tenant, "campaigns");

const summaryTenant = "work-summary-agency";
const summaryCampaignsDir = path.join(workRoot, summaryTenant, "campaigns");
const summaryResearchDir = path.join(workRoot, summaryTenant, "research");

beforeAll(async () => {
  await mkdir(campaignsDir, { recursive: true });
  await writeFile(
    path.join(campaignsDir, "a.md"),
    "---\ntitle: Alpha\ncreated: 2026-01-02\nstatus: draft\n---\nAlpha body line.\n",
    "utf8"
  );
  await writeFile(
    path.join(campaignsDir, "b.md"),
    "---\ntitle: Beta\ncreated: 2026-03-01\nstatus: active\n---\nBeta body line.\n",
    "utf8"
  );

  await mkdir(summaryCampaignsDir, { recursive: true });
  await writeFile(path.join(summaryCampaignsDir, "a.md"), "---\ntitle: A\n---\nbody\n", "utf8");
  await writeFile(path.join(summaryCampaignsDir, "b.md"), "---\ntitle: B\n---\nbody\n", "utf8");
  await mkdir(summaryResearchDir, { recursive: true });
  await writeFile(path.join(summaryResearchDir, "a.md"), "---\ntitle: A\n---\nbody\n", "utf8");
});

afterAll(async () => {
  await rm(path.join(workRoot, tenant), { recursive: true, force: true });
  await rm(path.join(workRoot, summaryTenant), { recursive: true, force: true });
});

test("GET list returns entries sorted by created desc, titles parsed", async () => {
  const res = await app.request(`/api/work/${tenant}/campaigns`);
  expect(res.status).toBe(200);
  const body = await res.json() as { slug: string; title: string; created: string; status: string }[];
  expect(body).toHaveLength(2);
  const [first, second] = body;
  expect(first?.title).toBe("Beta");
  expect(first?.slug).toBe("b");
  expect(second?.title).toBe("Alpha");
});

test("GET read returns the parsed artifact with body stripped of frontmatter", async () => {
  const res = await app.request(`/api/work/${tenant}/campaigns/a`);
  expect(res.status).toBe(200);
  const body = await res.json() as { title: string; body: string };
  expect(body.title).toBe("Alpha");
  expect(body.body).toContain("Alpha body line.");
  expect(body.body).not.toContain("---");
});

test("GET list with bad capability type returns 400", async () => {
  const res = await app.request(`/api/work/${tenant}/bogus`);
  expect(res.status).toBe(400);
});

test("GET read with missing slug returns 404", async () => {
  const res = await app.request(`/api/work/${tenant}/campaigns/missing`);
  expect(res.status).toBe(404);
});

test("GET list for a type dir that doesn't exist on disk returns empty array", async () => {
  const res = await app.request(`/api/work/${tenant}/strategy`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual([]);
});

test("GET list with bad tenant id returns 400", async () => {
  const res = await app.request(`/api/work/Bad_Tenant/campaigns`);
  expect(res.status).toBe(400);
});

test("parseFrontmatter extracts data and strips the block from body", () => {
  const { data, body } = parseFrontmatter("---\ntitle: X\n---\nhello");
  expect(data.title).toBe("X");
  expect(body).toBe("hello");
});

test("parseFrontmatter returns empty data and the original body when there is no frontmatter", () => {
  const { data, body } = parseFrontmatter("no fm");
  expect(data).toEqual({});
  expect(body).toBe("no fm");
});

test("GET summary returns counts for all five capabilities", async () => {
  const res = await app.request(`/api/work/${summaryTenant}`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({
    research: 1,
    keywords: 0,
    strategy: 0,
    campaigns: 2,
    analytics: 0,
  });
});

test("GET summary with bad tenant id returns 400", async () => {
  const res = await app.request(`/api/work/Bad_Tenant`);
  expect(res.status).toBe(400);
});

describe("rewriteStatus", () => {
  it("replaces an existing status line and preserves everything else byte-for-byte", () => {
    const raw = "---\ntitle: T\ncreated: 2026-07-15\nstatus: in_review\n---\n\n# Body\n";
    expect(rewriteStatus(raw, "approved"))
      .toBe("---\ntitle: T\ncreated: 2026-07-15\nstatus: approved\n---\n\n# Body\n");
  });
  it("appends a status line inside frontmatter when none exists", () => {
    const raw = "---\ntitle: T\n---\nBody\n";
    expect(rewriteStatus(raw, "archived")).toBe("---\ntitle: T\nstatus: archived\n---\nBody\n");
  });
  it("adds a frontmatter block when the file has none", () => {
    expect(rewriteStatus("Body\n", "approved")).toBe("---\nstatus: approved\n---\nBody\n");
  });
});

const statusTenant = "work-status-agency";
const statusDir = path.join(workRoot, statusTenant, "campaigns");

beforeAll(async () => {
  await mkdir(statusDir, { recursive: true });
  await writeFile(
    path.join(statusDir, "a.md"),
    "---\ntitle: A\ncreated: 2026-01-02\nstatus: in_review\n---\nBody.\n",
    "utf8"
  );
});

afterAll(async () => {
  await rm(path.join(workRoot, statusTenant), { recursive: true, force: true });
});

test("POST status with invalid status value returns 400", async () => {
  const res = await app.request(`/api/work/${statusTenant}/campaigns/a/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "bogus" }),
  });
  expect(res.status).toBe(400);
});

test("POST status for a missing slug returns 404", async () => {
  const res = await app.request(`/api/work/${statusTenant}/campaigns/missing/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  expect(res.status).toBe(404);
});

test("POST status rewrites the file on disk and returns the updated summary", async () => {
  const res = await app.request(`/api/work/${statusTenant}/campaigns/a/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { slug: string; status: string };
  expect(body.slug).toBe("a");
  expect(body.status).toBe("approved");
  const raw = await readFile(path.join(statusDir, "a.md"), "utf8");
  expect(raw).toContain("status: approved");
});

const countsTenant = "work-counts-agency";
const countsDir = path.join(workRoot, countsTenant, "campaigns");

beforeAll(async () => {
  await mkdir(countsDir, { recursive: true });
  await writeFile(
    path.join(countsDir, "archived.md"),
    "---\ntitle: Archived\nstatus: archived\n---\nBody.\n",
    "utf8"
  );
  await writeFile(
    path.join(countsDir, "active.md"),
    "---\ntitle: Active\nstatus: in_review\n---\nBody.\n",
    "utf8"
  );
});

afterAll(async () => {
  await rm(path.join(workRoot, countsTenant), { recursive: true, force: true });
});

test("GET summary counts exclude archived docs", async () => {
  const res = await app.request(`/api/work/${countsTenant}`);
  expect(res.status).toBe(200);
  const body = await res.json() as Record<string, number>;
  expect(body.campaigns).toBe(1);
});
