import path from "node:path";
import { isCapabilityId } from "./capabilities.js";

// data/ lives two levels up from the dashboard app cwd (matches researchAssets.mjs).
export const setupRoot = path.resolve(process.cwd(), "..", "..", "data", "setup");

const TENANT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTenantId(tenantId: unknown): tenantId is string {
  return typeof tenantId === "string" && TENANT_ID.test(tenantId);
}

export function resolveTenantSetupDir(tenantId: string): string | null {
  if (!isValidTenantId(tenantId)) return null;
  const resolved = path.resolve(setupRoot, tenantId);
  if (resolved !== path.join(setupRoot, tenantId)) return null;
  if (!resolved.startsWith(setupRoot + path.sep)) return null;
  return resolved;
}

export function resolveSetupAssetPath(tenantId: string, filename: string): string | null {
  const dir = resolveTenantSetupDir(tenantId);
  if (!dir) return null;
  if (typeof filename !== "string" || filename.length === 0) return null;
  // single path segment only — no separators, no traversal
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  const assetsDir = path.join(dir, "assets");
  const resolved = path.resolve(assetsDir, filename);
  if (!resolved.startsWith(assetsDir + path.sep)) return null;
  return resolved;
}

// Markdown artifact each stage produces, relative to the tenant setup dir.
const STAGE_ARTIFACT_FILE: Record<string, string> = {
  "import-intake": "intake.md",
  voice: "voice.md",
  icp: "icp.md",
  vertical: "vertical.md",
  "competitor-research": "competitor-research.md",
  "profile-build": "profile-linkedin.md",
};

export function resolveStageArtifactPath(tenantId: string, stage: string): string | null {
  const dir = resolveTenantSetupDir(tenantId);
  if (!dir) return null;
  const file = STAGE_ARTIFACT_FILE[stage];
  if (!file) return null;
  const resolved = path.resolve(dir, file);
  if (!resolved.startsWith(dir + path.sep)) return null;
  return resolved;
}

export function stageArtifactRelPath(tenantId: string, stage: string): string | null {
  const file = STAGE_ARTIFACT_FILE[stage];
  if (!isValidTenantId(tenantId) || !file) return null;
  return `data/setup/${tenantId}/${file}`;
}

export function resolveDesignSystemDir(tenantId: string): string | null {
  const dir = resolveTenantSetupDir(tenantId);
  if (!dir) return null;
  return path.join(dir, "design-system");
}

export function resolveDesignPreviewPath(tenantId: string, filename: string): string | null {
  const dsDir = resolveDesignSystemDir(tenantId);
  if (!dsDir) return null;
  if (typeof filename !== "string" || filename.length === 0) return null;
  // single path segment only — no separators, no traversal, must end in .html
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  if (!filename.endsWith(".html")) return null;
  const previewsDir = path.join(dsDir, "previews");
  const resolved = path.resolve(previewsDir, filename);
  if (!resolved.startsWith(previewsDir + path.sep)) return null;
  return resolved;
}

// data/content lives alongside data/setup.
export const contentRoot = path.resolve(process.cwd(), "..", "..", "data", "content");

function isSafeSegment(name: unknown): name is string {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..")
  );
}

export function resolveContentDir(tenantId: string): string | null {
  if (!isValidTenantId(tenantId)) return null;
  const resolved = path.resolve(contentRoot, tenantId);
  if (resolved !== path.join(contentRoot, tenantId)) return null;
  if (!resolved.startsWith(contentRoot + path.sep)) return null;
  return resolved;
}

export function resolveContentItemPath(tenantId: string, id: string): string | null {
  const dir = resolveContentDir(tenantId);
  if (!dir || !isSafeSegment(id)) return null;
  const itemsDir = path.join(dir, "items");
  const resolved = path.resolve(itemsDir, `${id}.json`);
  return resolved.startsWith(itemsDir + path.sep) ? resolved : null;
}

export function resolveContentRequestPath(tenantId: string, id: string): string | null {
  const dir = resolveContentDir(tenantId);
  if (!dir || !isSafeSegment(id)) return null;
  const reqDir = path.join(dir, "requests");
  const resolved = path.resolve(reqDir, `${id}.json`);
  return resolved.startsWith(reqDir + path.sep) ? resolved : null;
}

export function resolveContentAssetDir(tenantId: string, itemId: string): string | null {
  const dir = resolveContentDir(tenantId);
  if (!dir || !isSafeSegment(itemId)) return null;
  return path.join(dir, "assets", itemId);
}

export function resolveContentAssetPath(
  tenantId: string,
  itemId: string,
  assetFile: string
): string | null {
  const assetsDir = resolveContentAssetDir(tenantId, itemId);
  if (!assetsDir || !isSafeSegment(assetFile)) return null;
  const resolved = path.resolve(assetsDir, assetFile);
  return resolved.startsWith(assetsDir + path.sep) ? resolved : null;
}

const CONTENT_FILES = new Set(["cadence.json", "learnings.jsonl", "runs.jsonl"]);
export function resolveContentFile(tenantId: string, name: string): string | null {
  const dir = resolveContentDir(tenantId);
  if (!dir || !CONTENT_FILES.has(name)) return null;
  return path.join(dir, name);
}

// data/work lives alongside data/content and data/setup.
export const workRoot = path.resolve(process.cwd(), "..", "..", "data", "work");

export function resolveWorkTypeDir(tenantId: string, type: string): string | null {
  if (!isValidTenantId(tenantId) || !isCapabilityId(type)) return null;
  const tenantDir = path.resolve(workRoot, tenantId);
  if (tenantDir !== path.join(workRoot, tenantId)) return null;
  if (!tenantDir.startsWith(workRoot + path.sep)) return null;
  const resolved = path.resolve(tenantDir, type);
  return resolved.startsWith(tenantDir + path.sep) ? resolved : null;
}

export function resolveWorkFile(tenantId: string, type: string, slug: string): string | null {
  const dir = resolveWorkTypeDir(tenantId, type);
  if (!dir || !isSafeSegment(slug)) return null;
  const resolved = path.resolve(dir, `${slug}.md`);
  return resolved.startsWith(dir + path.sep) ? resolved : null;
}

// data/analytics lives alongside data/content, data/setup, and data/work.
export const analyticsRoot = path.resolve(process.cwd(), "..", "..", "data", "analytics");

export function resolveAnalyticsDir(tenantId: string): string | null {
  if (!isValidTenantId(tenantId)) return null;
  const resolved = path.resolve(analyticsRoot, tenantId);
  if (resolved !== path.join(analyticsRoot, tenantId)) return null;
  if (!resolved.startsWith(analyticsRoot + path.sep)) return null;
  return resolved;
}

export function resolveAnalyticsFile(tenantId: string): string | null {
  const dir = resolveAnalyticsDir(tenantId);
  if (!dir) return null;
  return path.join(dir, "posts.json");
}

// data/analytics/imports/<tenant>/ holds dropped LinkedIn XLSX exports, with
// processed/ and failed/ subfolders created on demand by the importer.
export const analyticsImportsRoot = path.join(analyticsRoot, "imports");

export function resolveAnalyticsImportsDir(tenantId: string): string | null {
  if (!isValidTenantId(tenantId)) return null;
  const resolved = path.resolve(analyticsImportsRoot, tenantId);
  if (resolved !== path.join(analyticsImportsRoot, tenantId)) return null;
  if (!resolved.startsWith(analyticsImportsRoot + path.sep)) return null;
  return resolved;
}
