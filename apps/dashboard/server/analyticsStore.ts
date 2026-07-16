import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { resolveAnalyticsFile } from "../src/lib/setupPaths.js";
import type { AnalyticsData, AnalyticsPost, AnalyticsCapture } from "../src/lib/analyticsTypes.js";

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

// Serializes appendCapture calls per tenant so concurrent read-modify-write
// cycles (e.g. a file watcher firing once per dropped file) can't race and
// silently drop one call's capture. Each tenant's calls are chained off the
// tail of its own promise; the chain is kept alive across rejections so one
// failed call never wedges later calls for the same tenant.
const tenantLocks = new Map<string, Promise<unknown>>();

function runExclusive<T>(tenant: string, task: () => Promise<T>): Promise<T> {
  const previous = tenantLocks.get(tenant) ?? Promise.resolve();
  const run = previous.then(task, task);
  tenantLocks.set(
    tenant,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

export function analyticsFile(tenant: string): string | null {
  return resolveAnalyticsFile(tenant);
}

export async function readAnalytics(tenant: string): Promise<AnalyticsData> {
  const file = analyticsFile(tenant);
  if (!file) return { posts: [] };
  const raw = await readFile(file, "utf8").catch(() => null);
  if (raw === null) return { posts: [] };
  try {
    const parsed = JSON.parse(raw) as AnalyticsData;
    return { posts: parsed.posts ?? [] };
  } catch {
    return { posts: [] };
  }
}

function findPostIndex(posts: AnalyticsPost[], post: Omit<AnalyticsPost, "captures">): number {
  if (post.urn) {
    const i = posts.findIndex((p) => p.urn === post.urn);
    if (i !== -1) return i;
  }
  if (post.postUrl) {
    const i = posts.findIndex((p) => p.postUrl === post.postUrl);
    if (i !== -1) return i;
  }
  return posts.findIndex((p) => p.id === post.id);
}

function mergePostFields(
  existing: AnalyticsPost,
  incoming: Omit<AnalyticsPost, "captures">
): AnalyticsPost {
  const { id: _id, ...rest } = incoming;
  const defined = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined)
  );
  // Contract: on a urn/postUrl match, the existing post's id is its stable
  // identity and is never overwritten by the incoming id. Callers must use
  // the returned postId, not assume the incoming post's id was applied.
  return { ...existing, ...defined };
}

function captureMetricsEqual(a: AnalyticsCapture, b: AnalyticsCapture): boolean {
  const { capturedAt: _a, ...restA } = a;
  const { capturedAt: _b, ...restB } = b;
  return JSON.stringify(restA) === JSON.stringify(restB);
}

function findDuplicateCapture(
  captures: AnalyticsCapture[],
  capture: AnalyticsCapture
): boolean {
  const capturedAtMs = new Date(capture.capturedAt).getTime();
  return captures.some((existing) => {
    if (!captureMetricsEqual(existing, capture)) return false;
    const existingMs = new Date(existing.capturedAt).getTime();
    return Math.abs(capturedAtMs - existingMs) <= DEDUPE_WINDOW_MS;
  });
}

export async function appendCapture(
  tenant: string,
  post: Omit<AnalyticsPost, "captures">,
  capture: AnalyticsCapture
): Promise<{ postId: string; deduped: boolean }> {
  const file = analyticsFile(tenant);
  if (!file) throw new Error(`Invalid tenant: ${tenant}`);

  return runExclusive(tenant, async () => {
    const data = await readAnalytics(tenant);
    const index = findPostIndex(data.posts, post);

    if (index === -1) {
      const newPost: AnalyticsPost = { ...post, captures: [capture] };
      data.posts.push(newPost);
      await writeAnalytics(file, data);
      return { postId: newPost.id, deduped: false };
    }

    const existing = data.posts[index]!;
    const merged = mergePostFields(existing, post);

    if (findDuplicateCapture(merged.captures, capture)) {
      data.posts[index] = merged;
      await writeAnalytics(file, data);
      return { postId: merged.id, deduped: true };
    }

    merged.captures = [...merged.captures, capture];
    data.posts[index] = merged;
    await writeAnalytics(file, data);
    return { postId: merged.id, deduped: false };
  });
}

async function writeAnalytics(file: string, data: AnalyticsData): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmpFile = `${file}.tmp`;
  await writeFile(tmpFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmpFile, file);
}
