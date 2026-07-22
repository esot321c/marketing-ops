import { test, expect, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { registerRoutes } from "./routes.js";
import { dataRoot, resolveContentDir, resolveBoardPrefsFile } from "../src/lib/setupPaths.js";
import { ALL_BOARD_STATES } from "../src/lib/contentLibrary.js";

const dir = resolveContentDir("board-prefs-agency")!;
const tenantsRoot = path.resolve(process.cwd(), "..", "..", "data", "tenants");
const tenantFile = path.join(tenantsRoot, "board-prefs-agency.json");

const app = new Hono();
registerRoutes(app);

beforeAll(async () => {
  await mkdir(dir, { recursive: true });
  await mkdir(tenantsRoot, { recursive: true });
  await writeFile(tenantFile, JSON.stringify({ id: "board-prefs-agency", name: "Board Prefs Agency" }));
});
afterAll(async () => {
  await rm(path.join(dataRoot, "board-prefs-agency"), { recursive: true, force: true });
  await rm(tenantFile, { force: true });
});

test("GET board-prefs returns defaults when the file is absent", async () => {
  const res = await app.request("/api/content/board-prefs-agency/board-prefs");
  expect(res.status).toBe(200);
  const body = await res.json() as { columnOrder: string[]; columnColors: Record<string, string> };
  expect(body.columnOrder).toEqual(ALL_BOARD_STATES);
  expect(body.columnColors).toEqual({});
});

test("GET board-prefs for an unknown tenant returns 404", async () => {
  const res = await app.request("/api/content/no-such-tenant/board-prefs");
  expect(res.status).toBe(404);
});

test("POST board-prefs saves and GET reloads the same order and colors", async () => {
  const order = ["approved", "idea", "drafting", "in_review", "scheduled", "posted", "measured", "needs_work", "parked"];
  const colors = { idea: "blue", parked: "slate" };
  const post = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: order, columnColors: colors }),
  });
  expect(post.status).toBe(200);
  const posted = await post.json() as { columnOrder: string[]; columnColors: Record<string, string> };
  expect(posted.columnOrder).toEqual(order);
  expect(posted.columnColors).toEqual(colors);

  const get = await app.request("/api/content/board-prefs-agency/board-prefs");
  const got = await get.json() as { columnOrder: string[]; columnColors: Record<string, string> };
  expect(got.columnOrder).toEqual(order);
  expect(got.columnColors).toEqual(colors);

  const file = resolveBoardPrefsFile("board-prefs-agency")!;
  const saved = JSON.parse(await readFile(file, "utf8"));
  expect(saved.columnOrder).toEqual(order);
  expect(saved.columnColors).toEqual(colors);
});

test("POST board-prefs appends a state missing from the saved order", async () => {
  const partialOrder = ALL_BOARD_STATES.filter((s) => s !== "parked");
  const post = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: partialOrder }),
  });
  expect(post.status).toBe(200);
  const body = await post.json() as { columnOrder: string[] };
  expect(body.columnOrder).toEqual([...partialOrder, "parked"]);
});

test("POST board-prefs drops an invalid state from columnOrder", async () => {
  const post = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: ["idea", "bogus-state"] }),
  });
  expect(post.status).toBe(200);
  const body = await post.json() as { columnOrder: string[] };
  expect(body.columnOrder).not.toContain("bogus-state");
});

test("POST board-prefs strips a color that is not in the palette", async () => {
  const res = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: ALL_BOARD_STATES, columnColors: { idea: "#ff00ff" } }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { columnColors: Record<string, string> };
  expect(body.columnColors).not.toHaveProperty("idea");
});

test("POST board-prefs strips a columnColors key that is not a known ContentState", async () => {
  const res = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: ALL_BOARD_STATES, columnColors: { "bogus-state": "blue" } }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { columnColors: Record<string, string> };
  expect(body.columnColors).not.toHaveProperty("bogus-state");
});

test("POST board-prefs round-trips a valid color", async () => {
  const res = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: ALL_BOARD_STATES, columnColors: { idea: "blue" } }),
  });
  expect(res.status).toBe(200);
  const body = await res.json() as { columnColors: Record<string, string> };
  expect(body.columnColors).toEqual({ idea: "blue" });
});

test("POST board-prefs for an unknown tenant returns 404", async () => {
  const res = await app.request("/api/content/no-such-tenant/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: ALL_BOARD_STATES }),
  });
  expect(res.status).toBe(404);
});

test("POST board-prefs rejects a missing or malformed columnOrder", async () => {
  const missing = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  expect(missing.status).toBe(400);

  const notArray = await app.request("/api/content/board-prefs-agency/board-prefs", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ columnOrder: "idea" }),
  });
  expect(notArray.status).toBe(400);
});
