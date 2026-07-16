import { mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { parseSinglePostWorkbook } from "./linkedinXlsx.js";
import { appendCapture } from "./analyticsStore.js";
import { analyticsImportsRoot, resolveAnalyticsImportsDir, resolveContentDir } from "../src/lib/setupPaths.js";
import type { AnalyticsCapture, AnalyticsPost } from "../src/lib/analyticsTypes.js";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// LinkedIn slugs are length-capped, so a directional prefix match can go either way:
// a long headline gets truncated into the slug, or a short headline's slug keeps
// running into the post body. Either direction is only trustworthy once the shorter
// of the two strings carries enough signal to rule out a coincidental match.
const MIN_PREFIX_MATCH_LENGTH = 16;

async function findMatchingItemId(tenant: string, titleSlug: string | null): Promise<string | undefined> {
  if (!titleSlug) return undefined;
  const dir = resolveContentDir(tenant);
  if (!dir) return undefined;
  const itemsDir = path.join(dir, "items");
  const names = await readdir(itemsDir).catch(() => [] as string[]);
  const needle = normalize(titleSlug);
  if (!needle) return undefined;

  const matches: string[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const raw = await readFile(path.join(itemsDir, name), "utf8").catch(() => null);
    if (raw === null) continue;
    let item: { id?: unknown; title?: unknown; assets?: unknown };
    try {
      item = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidates: string[] = [];
    if (typeof item.title === "string") candidates.push(item.title);
    if (Array.isArray(item.assets)) {
      for (const asset of item.assets) {
        const content = (asset as { content?: { type?: string; copy?: { headline?: string } } })?.content;
        if (content?.type === "copy" && typeof content.copy?.headline === "string") {
          candidates.push(content.copy.headline);
        }
      }
    }
    const isMatch = candidates.some((c) => {
      const normalized = normalize(c);
      if (Math.min(normalized.length, needle.length) < MIN_PREFIX_MATCH_LENGTH) return false;
      return normalized.startsWith(needle) || needle.startsWith(normalized);
    });
    if (isMatch && typeof item.id === "string") matches.push(item.id);
  }

  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : undefined;
}

async function moveTo(filePath: string, tenant: string, subfolder: "processed" | "failed"): Promise<void> {
  const importsDir = resolveAnalyticsImportsDir(tenant);
  if (!importsDir) return;
  const destDir = path.join(importsDir, subfolder);
  await mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, path.basename(filePath));
  await rename(filePath, dest);
}

export async function importXlsxFile(
  tenant: string,
  filePath: string
): Promise<{ postId: string; deduped: boolean }> {
  try {
    const [buffer, stats] = await Promise.all([readFile(filePath), stat(filePath)]);
    const parsed = await parseSinglePostWorkbook(buffer);

    const id = parsed.urn ?? (parsed.titleSlug ? slugify(parsed.titleSlug) : slugify(filePath));
    const title = parsed.titleSlug ?? id;
    const itemId = await findMatchingItemId(tenant, parsed.titleSlug);

    const post: Omit<AnalyticsPost, "captures"> = {
      id,
      title,
      ...(parsed.postUrl ? { postUrl: parsed.postUrl } : {}),
      ...(parsed.urn ? { urn: parsed.urn } : {}),
      ...(parsed.postedAt ? { postedAt: parsed.postedAt } : {}),
      ...(parsed.postedTime ? { postedTime: parsed.postedTime } : {}),
      ...(itemId ? { itemId } : {}),
    };

    const capture: AnalyticsCapture = {
      ...parsed.capture,
      capturedAt: stats.mtime.toISOString(),
      source: "xlsx-import",
    };

    const result = await appendCapture(tenant, post, capture);
    await moveTo(filePath, tenant, "processed");
    return result;
  } catch (err) {
    await moveTo(filePath, tenant, "failed").catch(() => {});
    throw err;
  }
}

export function watchImports(registerWatcher: (dir: string, onFile: (path: string) => void) => void): void {
  registerWatcher(analyticsImportsRoot, (filePath: string) => {
    const rel = path.relative(analyticsImportsRoot, filePath);
    const segments = rel.split(path.sep);
    const tenant = segments[0];
    if (!tenant) return;
    if (segments.includes("processed") || segments.includes("failed")) return;
    if (!filePath.toLowerCase().endsWith(".xlsx")) return;
    void importXlsxFile(tenant, filePath).catch((err) => {
      console.error("analyticsImport: import failed", filePath, err);
    });
  });
}
