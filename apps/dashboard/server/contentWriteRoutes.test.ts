import { test, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { registerRoutes } from "./routes.js";
import { dataRoot, resolveContentDir } from "../src/lib/setupPaths.js";
import { validateContentItem } from "../src/lib/contentTypes.js";

const app = new Hono();
registerRoutes(app);
const dir = resolveContentDir("write-test-agency")!;
// tenantExists() reads data/tenants/*.json (via listTenants), not the
// tenant's setup/ or content/ dir; write-test-agency isn't registered
// locally, so register it here.
const tenantsRoot = path.resolve(process.cwd(), "..", "..", "data", "tenants");
const tenantFile = path.join(tenantsRoot, "write-test-agency.json");

beforeAll(async () => {
  await mkdir(path.join(dir, "requests"), { recursive: true });
  await mkdir(tenantsRoot, { recursive: true });
  await writeFile(tenantFile, JSON.stringify({ id: "write-test-agency", name: "Write Test Agency" }));
});
afterAll(async () => {
  await rm(path.join(dataRoot, "write-test-agency"), { recursive: true, force: true });
  await rm(tenantFile, { force: true });
});

test("POST requests writes a pending request and returns the chat instruction", async () => {
  const res = await app.request("/api/content/write-test-agency/requests", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "a week of posts", channel: "linkedin" }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { id: string; instruction: string };
  expect(body.instruction).toContain("Fulfil content request");
  const saved = await readFile(path.join(dir, "requests", `${body.id}.json`), "utf8");
  expect(JSON.parse(saved).status).toBe("pending");
});

test("POST run in chat mode returns the instruction and does not spawn", async () => {
  const res = await app.request("/api/content/write-test-agency/run", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "draft-suggestion", mode: "chat" }),
  });
  const body = await res.json() as { instruction: string };
  expect(body.instruction).toContain("Draft the next suggested content piece");
});

test("POST run rejects an unavailable headless mode", async () => {
  const res = await app.request("/api/content/write-test-agency/run", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "draft-suggestion", mode: "headless-apikey" }),
  });
  // No ANTHROPIC_API_KEY in the test env -> mode unavailable.
  expect(res.status).toBe(409);
});

test("POST state validates the target state and updates the item", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "s1.json"), JSON.stringify({
    id: "s1", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const ok = await app.request("/api/content/write-test-agency/s1/state", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "approved" }),
  });
  expect(ok.status).toBe(200);
  const bad = await app.request("/api/content/write-test-agency/s1/state", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "bogus" }),
  });
  expect(bad.status).toBe(400);
});

test("POST state preserves an existing caption", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "cap1.json"), JSON.stringify({
    id: "cap1", tenantId: "write-test-agency", channel: "linkedin", format: "carousel",
    state: "in_review", title: "T", angle: "a", pillar: "p", caption: "Keep me",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const res = await app.request("/api/content/write-test-agency/cap1/state", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "approved" }),
  });
  expect(res.status).toBe(200);
  const saved = JSON.parse(await readFile(path.join(itemsDir, "cap1.json"), "utf8"));
  expect(saved.caption).toBe("Keep me");
  expect(saved.state).toBe("approved");
});

test("POST state accepts the needs_work and parked states", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "s2.json"), JSON.stringify({
    id: "s2", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const toNeedsWork = await app.request("/api/content/write-test-agency/s2/state", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "needs_work" }),
  });
  expect(toNeedsWork.status).toBe(200);
  const toParked = await app.request("/api/content/write-test-agency/s2/state", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "parked" }),
  });
  expect(toParked.status).toBe(200);
  const saved = JSON.parse(await readFile(path.join(itemsDir, "s2.json"), "utf8"));
  expect(saved.state).toBe("parked");
});

test("POST order writes the order field and returns the updated item", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "ord1.json"), JSON.stringify({
    id: "ord1", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const res = await app.request("/api/content/write-test-agency/ord1/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ order: 1.5 }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { ok: boolean; item: { order: number } };
  expect(body.ok).toBe(true);
  expect(body.item.order).toBe(1.5);
  const saved = JSON.parse(await readFile(path.join(itemsDir, "ord1.json"), "utf8"));
  expect(saved.order).toBe(1.5);
});

test("POST order rejects a missing or non-numeric order", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "ord2.json"), JSON.stringify({
    id: "ord2", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const missing = await app.request("/api/content/write-test-agency/ord2/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  expect(missing.status).toBe(400);
  const nonNumber = await app.request("/api/content/write-test-agency/ord2/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ order: "first" }),
  });
  expect(nonNumber.status).toBe(400);
  const notFinite = await app.request("/api/content/write-test-agency/ord2/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: '{"order":null}',
  });
  expect(notFinite.status).toBe(400);
});

test("POST order for an unknown tenant returns the same error shape as state", async () => {
  const res = await app.request("/api/content/no-such-tenant/ord1/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ order: 1 }),
  });
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Unknown tenant");
});

test("POST order for an unknown item id returns 400", async () => {
  const res = await app.request("/api/content/write-test-agency/no-such-item/order", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ order: 1 }),
  });
  expect(res.status).toBe(400);
});

test("POST run for refine includes the queued note in the instruction", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "run1.json"), JSON.stringify({
    id: "run1", tenantId: "write-test-agency", channel: "linkedin", format: "carousel",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [],
    refineLog: [{ at: "2026-07-13T00:00:00Z", instruction: "make it punchier", summary: "pending" }],
  }));
  const res = await app.request("/api/content/write-test-agency/run", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "refine", mode: "chat", targetId: "run1" }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.instruction).toContain('Queued refine note: "make it punchier"');
});

test("DELETE item removes the item file and returns ok", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  const itemFile = path.join(itemsDir, "del1.json");
  await writeFile(itemFile, JSON.stringify({
    id: "del1", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const res = await app.request("/api/content/write-test-agency/del1", { method: "DELETE" });
  expect(res.status).toBe(200);
  const body = await res.json() as { ok: boolean };
  expect(body.ok).toBe(true);
  await expect(readFile(itemFile, "utf8")).rejects.toThrow();
});

test("DELETE item for an unknown id returns the same not-found shape as state", async () => {
  const res = await app.request("/api/content/write-test-agency/no-such-item", { method: "DELETE" });
  expect(res.status).toBe(400);
  expect(await res.text()).toBe("Not found");
});

test("DELETE item for an unknown tenant returns 404", async () => {
  const res = await app.request("/api/content/no-such-tenant/del1", { method: "DELETE" });
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Unknown tenant");
});

test("POST run for refine states when no note is queued", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "run2.json"), JSON.stringify({
    id: "run2", tenantId: "write-test-agency", channel: "linkedin", format: "carousel",
    state: "in_review", title: "T", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));
  const res = await app.request("/api/content/write-test-agency/run", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "refine", mode: "chat", targetId: "run2" }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.instruction).toContain("No refine note queued");
});

test("POST duplicate creates a new item with a fresh id, idea state, and reset fields", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  const sourceFile = path.join(itemsDir, "dup1.json");
  const source = {
    id: "dup1", tenantId: "write-test-agency", channel: "linkedin", format: "carousel",
    state: "in_review", title: "Original title", angle: "a", pillar: "p",
    order: 3,
    assets: [{ id: "a1", kind: "carousel-visual", route: "local-harness", status: "ready" }],
    schedule: { status: "scheduled", date: "2026-08-01" },
    source: ["https://example.com/source"],
    citations: [{ label: "Example", url: "https://example.com" }],
    refineLog: [{ at: "2026-07-01T00:00:00Z", instruction: "tighten it", summary: "done" }],
  };
  await writeFile(sourceFile, JSON.stringify(source));

  const res = await app.request("/api/content/write-test-agency/dup1/duplicate", { method: "POST" });
  expect(res.status).toBe(200);
  const newItem = await res.json() as Record<string, unknown>;

  expect(newItem.id).toBe("dup1-copy");
  expect(newItem.state).toBe("idea");
  expect(newItem.title).toBe("Original title (copy)");
  expect(newItem.order).toBeUndefined();
  expect(newItem.schedule).toEqual({ status: "unscheduled" });
  expect(newItem.refineLog).toEqual([]);
  expect(newItem.assets).toEqual(source.assets);
  expect(newItem.citations).toEqual(source.citations);
  expect(newItem.source).toEqual(source.source);
  expect(newItem.angle).toBe("a");
  expect(newItem.pillar).toBe("p");
  expect(newItem.channel).toBe("linkedin");
  expect(newItem.format).toBe("carousel");
  expect(newItem.tenantId).toBe("write-test-agency");
  expect(validateContentItem(newItem)).toBe(true);

  const savedRaw = await readFile(path.join(itemsDir, "dup1-copy.json"), "utf8");
  const saved = JSON.parse(savedRaw);
  expect(saved).toEqual(newItem);
  expect(Object.prototype.hasOwnProperty.call(saved, "order")).toBe(false);

  // Deep-copy correctness: mutating the returned/saved item must not affect the source file.
  const sourceAfter = JSON.parse(await readFile(sourceFile, "utf8"));
  expect(sourceAfter).toEqual(source);
  (newItem.assets as unknown[]).push({ id: "mutated" });
  (newItem.refineLog as unknown[]).push({ at: "x", instruction: "x", summary: "x" });
  const sourceStillIntact = JSON.parse(await readFile(sourceFile, "utf8"));
  expect(sourceStillIntact).toEqual(source);
});

test("POST duplicate of the same source twice avoids id collision", async () => {
  const itemsDir = path.join(dir, "items");
  await mkdir(itemsDir, { recursive: true });
  await writeFile(path.join(itemsDir, "dup2.json"), JSON.stringify({
    id: "dup2", tenantId: "write-test-agency", channel: "linkedin", format: "text-post",
    state: "approved", title: "Second source", angle: "a", pillar: "p",
    assets: [], schedule: { status: "unscheduled" }, source: [], refineLog: [],
  }));

  const first = await app.request("/api/content/write-test-agency/dup2/duplicate", { method: "POST" });
  expect(first.status).toBe(200);
  const firstBody = await first.json() as { id: string };
  expect(firstBody.id).toBe("dup2-copy");

  const second = await app.request("/api/content/write-test-agency/dup2/duplicate", { method: "POST" });
  expect(second.status).toBe(200);
  const secondBody = await second.json() as { id: string };
  expect(secondBody.id).toBe("dup2-copy2");

  const firstStillThere = await readFile(path.join(itemsDir, "dup2-copy.json"), "utf8");
  expect(JSON.parse(firstStillThere).id).toBe("dup2-copy");
});

test("POST duplicate for an unknown id returns the same not-found shape as state", async () => {
  const res = await app.request("/api/content/write-test-agency/no-such-item/duplicate", { method: "POST" });
  expect(res.status).toBe(400);
  expect(await res.text()).toBe("Not found");
});

test("POST duplicate for an unknown tenant returns 404", async () => {
  const res = await app.request("/api/content/no-such-tenant/dup1/duplicate", { method: "POST" });
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("Unknown tenant");
});
