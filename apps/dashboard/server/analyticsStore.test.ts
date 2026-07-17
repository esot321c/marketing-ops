import { test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Hono } from "hono";
import { mkdir, rm, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyticsFile, readAnalytics, appendCapture } from "./analyticsStore.js";
import { registerRoutes } from "./routes.js";
import { analyticsRoot } from "../src/lib/setupPaths.js";
import type { AnalyticsPost, AnalyticsCapture } from "../src/lib/analyticsTypes.js";

const tenant = "analytics-test-agency";
const tenantDir = path.join(analyticsRoot, tenant);

beforeAll(async () => {
  await mkdir(tenantDir, { recursive: true });
});

afterEach(async () => {
  await rm(tenantDir, { recursive: true, force: true });
  await mkdir(tenantDir, { recursive: true });
});

afterAll(async () => {
  await rm(tenantDir, { recursive: true, force: true });
});

function capture(overrides: Partial<AnalyticsCapture> = {}): AnalyticsCapture {
  return {
    capturedAt: "2026-07-16T10:00:00.000Z",
    source: "xlsx-import",
    impressions: 1000,
    membersReached: 800,
    inNetworkPct: 40,
    socialEngagements: 50,
    reactions: 30,
    comments: 10,
    reposts: 5,
    saves: 2,
    sends: 3,
    linkEngagements: 1,
    premiumButtonEngagements: null,
    profileViewers: 20,
    followersGained: 4,
    ...overrides,
  };
}

function post(overrides: Partial<Omit<AnalyticsPost, "captures">> = {}): Omit<AnalyticsPost, "captures"> {
  return {
    id: "post-1",
    title: "Example post title",
    urn: "urn:li:share:1111",
    postUrl: "https://example.com/posts/1111",
    ...overrides,
  };
}

test("analyticsFile resolves to data/analytics/<tenant>/posts.json", () => {
  const file = analyticsFile(tenant);
  expect(file).toBe(path.join(tenantDir, "posts.json"));
});

test("analyticsFile returns null for an invalid tenant", () => {
  expect(analyticsFile("Bad_Tenant")).toBeNull();
  expect(analyticsFile("../escape")).toBeNull();
});

test("readAnalytics returns an empty posts array when the store file is absent", async () => {
  const data = await readAnalytics(tenant);
  expect(data).toEqual({ posts: [] });
});

test("appendCapture creates the file and adds a new post record", async () => {
  const result = await appendCapture(tenant, post(), capture());
  expect(result.deduped).toBe(false);
  expect(result.postId).toBe("post-1");

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]?.id).toBe("post-1");
  expect(data.posts[0]?.title).toBe("Example post title");
  expect(data.posts[0]?.captures).toHaveLength(1);
  expect(data.posts[0]?.captures[0]?.impressions).toBe(1000);
});

test("a second, differing capture appends a new capture to the same post", async () => {
  await appendCapture(tenant, post(), capture());
  const result = await appendCapture(
    tenant,
    post(),
    capture({ capturedAt: "2026-07-17T10:00:00.000Z", impressions: 2000 })
  );
  expect(result.deduped).toBe(false);

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]?.captures).toHaveLength(2);
  expect(data.posts[0]?.captures[1]?.impressions).toBe(2000);
});

test("an identical capture within the hour dedupes and is not appended", async () => {
  await appendCapture(tenant, post(), capture({ capturedAt: "2026-07-16T10:00:00.000Z" }));
  const result = await appendCapture(
    tenant,
    post(),
    capture({ capturedAt: "2026-07-16T10:45:00.000Z" })
  );
  expect(result.deduped).toBe(true);

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]?.captures).toHaveLength(1);
});

test("an identical capture more than an hour later is not deduped", async () => {
  await appendCapture(tenant, post(), capture({ capturedAt: "2026-07-16T10:00:00.000Z" }));
  const result = await appendCapture(
    tenant,
    post(),
    capture({ capturedAt: "2026-07-16T12:00:00.000Z" })
  );
  expect(result.deduped).toBe(false);

  const data = await readAnalytics(tenant);
  expect(data.posts[0]?.captures).toHaveLength(2);
});

test("a matching urn does not duplicate the post even when other fields differ", async () => {
  await appendCapture(tenant, post({ id: "post-1", title: "Original title" }), capture());
  const result = await appendCapture(
    tenant,
    post({ id: "post-2", title: "Renamed title", urn: "urn:li:share:1111" }),
    capture({ capturedAt: "2026-07-18T10:00:00.000Z", impressions: 3000 })
  );

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(result.postId).toBe("post-1");
  expect(data.posts[0]?.captures).toHaveLength(2);
});

test("existing post fields are not overwritten by undefined incoming fields", async () => {
  await appendCapture(
    tenant,
    post({ postUrl: "https://example.com/posts/1111", format: "text" }),
    capture()
  );
  await appendCapture(
    tenant,
    { id: "post-1", title: "Example post title", urn: "urn:li:share:1111" },
    capture({ capturedAt: "2026-07-19T10:00:00.000Z", impressions: 4000 })
  );

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]?.postUrl).toBe("https://example.com/posts/1111");
  expect(data.posts[0]?.format).toBe("text");
});

test("no tmp file is left behind after a write", async () => {
  await appendCapture(tenant, post(), capture());
  const names = await readdir(tenantDir);
  expect(names).toContain("posts.json");
  expect(names.some((n) => n.endsWith(".tmp"))).toBe(false);
});

test("concurrent appendCapture calls for the same tenant both land in posts.json", async () => {
  await Promise.all([
    appendCapture(tenant, post({ id: "post-1" }), capture()),
    appendCapture(
      tenant,
      post({ id: "post-2", urn: "urn:li:share:2222", postUrl: "https://example.com/posts/2222" }),
      capture({ capturedAt: "2026-07-16T11:00:00.000Z", impressions: 500 })
    ),
  ]);

  const data = await readAnalytics(tenant);
  expect(data.posts).toHaveLength(2);
  const ids = data.posts.map((p) => p.id).sort();
  expect(ids).toEqual(["post-1", "post-2"]);
});

test("readAnalytics returns an empty posts array when the store file contains invalid JSON", async () => {
  const file = analyticsFile(tenant)!;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, "{ not valid json", "utf8");

  const data = await readAnalytics(tenant);
  expect(data).toEqual({ posts: [] });
});

const app = new Hono();
registerRoutes(app);

test("GET /api/analytics/:tenant returns 400 for an invalid tenant", async () => {
  const res = await app.request("/api/analytics/Bad_Tenant");
  expect(res.status).toBe(400);
});

test("GET /api/analytics/:tenant returns an empty posts array when the store is absent", async () => {
  const res = await app.request(`/api/analytics/${tenant}`);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toEqual({ posts: [] });
});

test("GET /api/analytics/:tenant returns stored posts", async () => {
  await appendCapture(tenant, post(), capture());
  const res = await app.request(`/api/analytics/${tenant}`);
  expect(res.status).toBe(200);
  const body = await res.json() as { posts: AnalyticsPost[] };
  expect(body.posts).toHaveLength(1);
  expect(body.posts[0]?.id).toBe("post-1");
});
