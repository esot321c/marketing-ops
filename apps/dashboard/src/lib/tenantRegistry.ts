import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantId } from "./setupPaths.js";
import type { TenantSummary } from "./types.js";

const tenantsRoot = path.resolve(process.cwd(), "..", "..", "data", "tenants");

export function parseTenantSummary(json: unknown): TenantSummary | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  if (typeof obj["id"] !== "string") return null;
  return {
    id: obj["id"],
    name: typeof obj["name"] === "string" ? obj["name"] : obj["id"],
  };
}

// Server-only: lists valid tenants from data/tenants/*.json.
export async function listTenants(): Promise<TenantSummary[]> {
  let files: string[] = [];
  try {
    files = await readdir(tenantsRoot);
  } catch {
    return [];
  }
  const out: TenantSummary[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(tenantsRoot, file), "utf8");
      const summary = parseTenantSummary(JSON.parse(raw) as unknown);
      if (summary && isValidTenantId(summary.id)) out.push(summary);
    } catch {
      // skip unreadable/invalid tenant files
    }
  }
  return out;
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  if (!isValidTenantId(tenantId)) return false;
  const tenants = await listTenants();
  return tenants.some((t) => t.id === tenantId);
}
