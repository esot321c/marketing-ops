#!/usr/bin/env node
// Migrates an old-layout data/ directory (type-first: data/setup/<tenant>,
// data/work/<tenant>/<type>, data/content/<tenant>, data/analytics/<tenant>,
// data/analytics/imports/<tenant>) to the tenant-first layout
// (data/<tenant>/{setup,work,content,analytics}/...), plus rehoming a small
// set of global registry files to data/shared/.
//
// Zero dependencies, Node only. Safe to run multiple times: a clean second
// run is a no-op. Refuses to overwrite a destination that already has
// different content: the whole run aborts before anything is moved.
//
// Usage:
//   node scripts/migrate-tenant-first.mjs [--dry-run] [--data-dir <path>]

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPE_ROOTS = ["setup", "work", "content", "analytics"];

// Global files that move to data/shared/. Keyed by their old location
// relative to dataDir, valued by their new filename under shared/.
const GLOBAL_FILES = [
  { from: ["setup", "intake.md"], to: "intake.md" },
  { from: ["content", "content-library.json"], to: "content-library.json" },
  { from: ["analytics", "analytics-review.json"], to: "analytics-review.json" },
];

async function pathExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(p) {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function listDirNames(p) {
  try {
    const entries = await fs.readdir(p, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Recursively compare two paths (file or directory) for identical content.
// Returns true only if both exist and have byte-identical file contents
// under identical relative structure.
async function contentsIdentical(a, b) {
  const [aStat, bStat] = await Promise.all([
    fs.stat(a).catch(() => null),
    fs.stat(b).catch(() => null),
  ]);
  if (!aStat || !bStat) return false;
  if (aStat.isDirectory() !== bStat.isDirectory()) return false;

  if (aStat.isFile()) {
    const [aBuf, bBuf] = await Promise.all([fs.readFile(a), fs.readFile(b)]);
    return aBuf.equals(bBuf);
  }

  // directory: compare entry name sets and recurse
  const [aEntries, bEntries] = await Promise.all([
    fs.readdir(a).then((names) => names.sort()),
    fs.readdir(b).then((names) => names.sort()),
  ]);
  if (aEntries.length !== bEntries.length) return false;
  for (let i = 0; i < aEntries.length; i++) {
    if (aEntries[i] !== bEntries[i]) return false;
  }
  for (const name of aEntries) {
    const same = await contentsIdentical(path.join(a, name), path.join(b, name));
    if (!same) return false;
  }
  return true;
}

async function removeIfEmpty(dir) {
  if (!(await isDirectory(dir))) return { removed: false, reason: "not-a-directory" };
  const entries = await fs.readdir(dir);
  if (entries.length > 0) return { removed: false, reason: "not-empty", entries };
  await fs.rmdir(dir);
  return { removed: true };
}

// Discover tenants from the old layout: union of subdirectories of
// data/setup, data/work, data/content, data/analytics (excluding
// "imports"), plus tenants that only appear as data/analytics/imports/<t>.
async function discoverTenants(dataDir) {
  const tenants = new Set();

  for (const root of ["setup", "work", "content"]) {
    for (const name of await listDirNames(path.join(dataDir, root))) {
      tenants.add(name);
    }
  }

  for (const name of await listDirNames(path.join(dataDir, "analytics"))) {
    if (name === "imports") continue;
    tenants.add(name);
  }

  for (const name of await listDirNames(path.join(dataDir, "analytics", "imports"))) {
    tenants.add(name);
  }

  return [...tenants].sort();
}

// Build the full list of planned per-tenant and global moves against the
// current state of dataDir. Each move is { from, to, kind }.
async function planMoves(dataDir, tenants) {
  const moves = [];

  for (const tenant of tenants) {
    const candidates = [
      { from: path.join(dataDir, "setup", tenant), to: path.join(dataDir, tenant, "setup") },
      { from: path.join(dataDir, "work", tenant), to: path.join(dataDir, tenant, "work") },
      { from: path.join(dataDir, "content", tenant), to: path.join(dataDir, tenant, "content") },
      {
        from: path.join(dataDir, "analytics", tenant),
        to: path.join(dataDir, tenant, "analytics"),
      },
      {
        from: path.join(dataDir, "analytics", "imports", tenant),
        to: path.join(dataDir, tenant, "analytics", "imports"),
      },
    ];
    for (const c of candidates) {
      if (await pathExists(c.from)) moves.push({ ...c, kind: "tenant", tenant });
    }
  }

  for (const g of GLOBAL_FILES) {
    const from = path.join(dataDir, ...g.from);
    if (await pathExists(from)) {
      moves.push({
        from,
        to: path.join(dataDir, "shared", g.to),
        kind: "global",
      });
    }
  }

  return moves;
}

// Pre-flight: for every planned move, check the destination. If it doesn't
// exist, the move proceeds. If it exists and is content-identical to the
// source, the move is skipped (source will be removed as a redundant
// duplicate). If it exists and differs, it's a conflict that aborts the
// whole run.
async function classifyMoves(moves) {
  const toExecute = [];
  const skipped = [];
  const conflicts = [];

  for (const move of moves) {
    const destExists = await pathExists(move.to);
    if (!destExists) {
      toExecute.push(move);
      continue;
    }
    const identical = await contentsIdentical(move.from, move.to);
    if (identical) {
      skipped.push(move);
    } else {
      conflicts.push(move);
    }
  }

  return { toExecute, skipped, conflicts };
}

async function executeMove(move) {
  await fs.mkdir(path.dirname(move.to), { recursive: true });
  await fs.rename(move.from, move.to);
}

// Remove a source that was skipped because an identical copy already lives
// at the destination (redundant duplicate left behind by a partial prior
// run).
async function removeRedundantSource(move) {
  await fs.rm(move.from, { recursive: true, force: true });
}

// After all moves/skips, clean up the old type-root dirs (setup, work,
// content, analytics, analytics/imports) if they are now empty. Anything
// unexpected left behind is reported, not deleted.
async function cleanupTypeRoots(dataDir) {
  const removed = [];
  const remaining = [];

  const importsDir = path.join(dataDir, "analytics", "imports");
  if (await pathExists(importsDir)) {
    const result = await removeIfEmpty(importsDir);
    if (result.removed) removed.push(importsDir);
    else if (result.reason === "not-empty") remaining.push({ dir: importsDir, entries: result.entries });
  }

  for (const root of TYPE_ROOTS) {
    const dir = path.join(dataDir, root);
    if (!(await pathExists(dir))) continue;
    const result = await removeIfEmpty(dir);
    if (result.removed) removed.push(dir);
    else if (result.reason === "not-empty") remaining.push({ dir, entries: result.entries });
  }

  return { removed, remaining };
}

/**
 * Migrate an old type-first data/ directory to the tenant-first layout.
 *
 * @param {string} dataDir - absolute path to the data directory to migrate.
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{
 *   dataDir: string,
 *   dryRun: boolean,
 *   aborted: boolean,
 *   tenants: string[],
 *   moves: Array<{from: string, to: string, kind: string, tenant?: string}>,
 *   skipped: Array<{from: string, to: string, kind: string, tenant?: string}>,
 *   conflicts: Array<{from: string, to: string, kind: string, tenant?: string}>,
 *   removedDirs: string[],
 *   remainingDirs: Array<{dir: string, entries: string[]}>,
 * }>}
 */
export async function migrate(dataDir, options = {}) {
  const dryRun = Boolean(options.dryRun);

  const tenants = await discoverTenants(dataDir);
  const allMoves = await planMoves(dataDir, tenants);
  const { toExecute, skipped, conflicts } = await classifyMoves(allMoves);

  if (conflicts.length > 0) {
    return {
      dataDir,
      dryRun,
      aborted: true,
      tenants,
      moves: [],
      skipped: [],
      conflicts,
      removedDirs: [],
      remainingDirs: [],
    };
  }

  if (dryRun) {
    return {
      dataDir,
      dryRun,
      aborted: false,
      tenants,
      moves: toExecute,
      skipped,
      conflicts: [],
      removedDirs: [],
      remainingDirs: [],
    };
  }

  for (const move of toExecute) {
    await executeMove(move);
  }
  for (const move of skipped) {
    await removeRedundantSource(move);
  }

  const { removed, remaining } = await cleanupTypeRoots(dataDir);

  return {
    dataDir,
    dryRun,
    aborted: false,
    tenants,
    moves: toExecute,
    skipped,
    conflicts: [],
    removedDirs: removed,
    remainingDirs: remaining,
  };
}

function formatMove(move) {
  return `  ${move.from} -> ${move.to}`;
}

export function printSummary(summary) {
  const lines = [];

  if (summary.aborted) {
    lines.push("Migration aborted: conflicting destinations found (nothing was moved).");
    lines.push("Conflicts:");
    for (const c of summary.conflicts) lines.push(formatMove(c));
    lines.push("Resolve or remove these destinations, then re-run.");
    console.log(lines.join("\n"));
    return;
  }

  lines.push(summary.dryRun ? "Dry run: planned moves" : "Migration complete");
  lines.push(`Tenants discovered: ${summary.tenants.length ? summary.tenants.join(", ") : "(none)"}`);

  if (summary.moves.length === 0) {
    lines.push("No moves needed (already migrated or nothing to migrate).");
  } else {
    lines.push(`Moves ${summary.dryRun ? "planned" : "performed"} (${summary.moves.length}):`);
    for (const m of summary.moves) lines.push(formatMove(m));
  }

  if (summary.skipped.length > 0) {
    lines.push(`Skipped (destination already identical, source removed) (${summary.skipped.length}):`);
    for (const s of summary.skipped) lines.push(formatMove(s));
  }

  if (!summary.dryRun) {
    if (summary.removedDirs.length > 0) {
      lines.push(`Removed now-empty old directories (${summary.removedDirs.length}):`);
      for (const d of summary.removedDirs) lines.push(`  ${d}`);
    }
    if (summary.remainingDirs.length > 0) {
      lines.push("Old directories left in place because they still contain unexpected files:");
      for (const r of summary.remainingDirs) {
        lines.push(`  ${r.dir} (contains: ${r.entries.join(", ")})`);
      }
    }
  }

  console.log(lines.join("\n"));
}

function parseArgs(argv) {
  let dryRun = false;
  let dataDir;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--data-dir") {
      dataDir = argv[++i];
    } else if (arg.startsWith("--data-dir=")) {
      dataDir = arg.slice("--data-dir=".length);
    }
  }
  return { dryRun, dataDir };
}

async function main() {
  const { dryRun, dataDir: dataDirArg } = parseArgs(process.argv.slice(2));
  const dataDir = path.resolve(dataDirArg ?? path.join(process.cwd(), "data"));

  const summary = await migrate(dataDir, { dryRun });
  printSummary(summary);

  if (summary.aborted) process.exitCode = 1;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
