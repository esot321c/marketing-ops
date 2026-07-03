import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveTenantSetupDir } from "./setupPaths.js";
import type { InitState } from "./types.js";

export async function readInitStateFrom<T = InitState>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeInitStateTo(file: string, state: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function initFileFor(tenantId: string): string {
  const dir = resolveTenantSetupDir(tenantId);
  if (!dir) throw new Error(`Invalid tenant: ${tenantId}`);
  return path.join(dir, "init.json");
}

export async function readInitState(tenantId: string): Promise<InitState | null> {
  return readInitStateFrom<InitState>(initFileFor(tenantId));
}

export async function writeInitState(tenantId: string, state: InitState): Promise<void> {
  await writeInitStateTo(initFileFor(tenantId), state);
}
