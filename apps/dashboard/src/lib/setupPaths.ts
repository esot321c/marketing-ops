import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { isCapabilityId } from "./capabilities.js";

// Tenant-first layout: data/<tenant>/{setup,work,content,analytics}/...
// data/ lives two levels up from the dashboard app cwd (matches researchAssets.mjs).
export const dataRoot = path.resolve(process.cwd(), "..", "..", "data");

// Global, non-tenant files (registries, cross-tenant config) live here.
export const sharedRoot = path.join(dataRoot, "shared");

const TENANT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTenantId(tenantId: unknown): tenantId is string {
  return typeof tenantId === "string" && TENANT_ID.test(tenantId);
}

// A tenant is any top-level directory under data/ containing a setup/
// subdirectory. Everything else at the top level (data/shared, legacy
// personal folders) is ignored by discovery.
export function listTenantDirs(): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dataRoot);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of entries) {
    if (!isValidTenantId(name)) continue;
    const setupDir = path.join(dataRoot, name, "setup");
    try {
      if (statSync(setupDir).isDirectory()) out.push(name);
    } catch {
      // no setup/ subdir, so not a tenant
    }
  }
  return out;
}

function resolveTenantRoot(tenantId: string): string | null {
  if (!isValidTenantId(tenantId)) return null;
  const resolved = path.resolve(dataRoot, tenantId);
  if (resolved !== path.join(dataRoot, tenantId)) return null;
  if (!resolved.startsWith(dataRoot + path.sep)) return null;
  return resolved;
}

export function resolveTenantSetupDir(tenantId: string): string | null {
  const tenantRoot = resolveTenantRoot(tenantId);
  if (!tenantRoot) return null;
  return path.join(tenantRoot, "setup");
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
  return `data/${tenantId}/setup/${file}`;
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
  const tenantRoot = resolveTenantRoot(tenantId);
  if (!tenantRoot) return null;
  return path.join(tenantRoot, "content");
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

export function resolveWorkTypeDir(tenantId: string, type: string): string | null {
  const tenantRoot = resolveTenantRoot(tenantId);
  if (!tenantRoot || !isCapabilityId(type)) return null;
  const workDir = path.join(tenantRoot, "work");
  const resolved = path.resolve(workDir, type);
  return resolved.startsWith(workDir + path.sep) ? resolved : null;
}

export function resolveWorkFile(tenantId: string, type: string, slug: string): string | null {
  const dir = resolveWorkTypeDir(tenantId, type);
  if (!dir || !isSafeSegment(slug)) return null;
  const resolved = path.resolve(dir, `${slug}.md`);
  return resolved.startsWith(dir + path.sep) ? resolved : null;
}

export function resolveAnalyticsDir(tenantId: string): string | null {
  const tenantRoot = resolveTenantRoot(tenantId);
  if (!tenantRoot) return null;
  return path.join(tenantRoot, "analytics");
}

export function resolveAnalyticsFile(tenantId: string): string | null {
  const dir = resolveAnalyticsDir(tenantId);
  if (!dir) return null;
  return path.join(dir, "posts.json");
}

// data/<tenant>/analytics/imports/ holds dropped LinkedIn XLSX exports, with
// processed/ and failed/ subfolders created on demand by the importer.
export function resolveAnalyticsImportsDir(tenantId: string): string | null {
  const dir = resolveAnalyticsDir(tenantId);
  if (!dir) return null;
  return path.join(dir, "imports");
}
