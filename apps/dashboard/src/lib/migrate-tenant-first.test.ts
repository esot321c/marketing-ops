import { mkdir, writeFile, rm, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect, beforeEach, afterEach } from "vitest";
import {
  migrate,
  MigrationExecutionError,
} from "../../../../scripts/migrate-tenant-first.mjs";

let tmpRoot: string;
let dataDir: string;

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function writeOldLayoutFixture(dataDir: string) {
  // tenant "example-agency": setup, work, content, analytics + imports
  await mkdir(path.join(dataDir, "setup", "example-agency"), { recursive: true });
  await writeFile(
    path.join(dataDir, "setup", "example-agency", "voice.md"),
    "# voice\n"
  );
  await mkdir(path.join(dataDir, "work", "example-agency", "campaigns"), { recursive: true });
  await writeFile(
    path.join(dataDir, "work", "example-agency", "campaigns", "q1.md"),
    "# q1 campaign\n"
  );
  await mkdir(path.join(dataDir, "content", "example-agency", "items"), { recursive: true });
  await writeFile(
    path.join(dataDir, "content", "example-agency", "items", "abc.json"),
    "{}"
  );
  await mkdir(path.join(dataDir, "content", "example-agency", "assets", "abc"), {
    recursive: true,
  });
  await writeFile(
    path.join(dataDir, "content", "example-agency", "assets", "abc", "a1.png"),
    "binary"
  );
  await mkdir(path.join(dataDir, "analytics", "example-agency"), { recursive: true });
  await writeFile(
    path.join(dataDir, "analytics", "example-agency", "posts.json"),
    "[]"
  );
  await mkdir(
    path.join(dataDir, "analytics", "imports", "example-agency", "processed"),
    { recursive: true }
  );
  await writeFile(
    path.join(dataDir, "analytics", "imports", "example-agency", "export.xlsx"),
    "binary"
  );
  await writeFile(
    path.join(
      dataDir,
      "analytics",
      "imports",
      "example-agency",
      "processed",
      "old-export.xlsx"
    ),
    "binary"
  );

  // tenant "example-personal": only setup + content, no work/analytics
  await mkdir(path.join(dataDir, "setup", "example-personal"), { recursive: true });
  await writeFile(
    path.join(dataDir, "setup", "example-personal", "voice.md"),
    "# voice personal\n"
  );
  await mkdir(path.join(dataDir, "content", "example-personal", "items"), {
    recursive: true,
  });
  await writeFile(
    path.join(dataDir, "content", "example-personal", "items", "def.json"),
    "{}"
  );

  // global files
  await writeFile(path.join(dataDir, "setup", "intake.md"), "# global intake\n");
  await writeFile(
    path.join(dataDir, "content", "content-library.json"),
    "[]"
  );
  await writeFile(
    path.join(dataDir, "analytics", "analytics-review.json"),
    "{}"
  );

  // unmanaged top-level dirs that must be left untouched
  await mkdir(path.join(dataDir, "brands"), { recursive: true });
  await writeFile(path.join(dataDir, "brands", "acme.md"), "# acme\n");
  await mkdir(path.join(dataDir, "tenants"), { recursive: true });
  await writeFile(path.join(dataDir, "tenants", "registry.json"), "[]");
}

beforeEach(async () => {
  tmpRoot = await import("node:fs/promises").then((fs) =>
    fs.mkdtemp(path.join(os.tmpdir(), "migrate-tenant-first-"))
  );
  dataDir = path.join(tmpRoot, "data");
  await mkdir(dataDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

test("migrates a full old-layout fixture to the tenant-first layout", async () => {
  await writeOldLayoutFixture(dataDir);

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(false);
  expect(summary.conflicts).toEqual([]);

  // example-agency moved
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice\n");
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "work", "campaigns", "q1.md"),
      "utf8"
    )
  ).toBe("# q1 campaign\n");
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "content", "items", "abc.json"),
      "utf8"
    )
  ).toBe("{}");
  expect(
    await readFile(
      path.join(
        dataDir,
        "example-agency",
        "content",
        "assets",
        "abc",
        "a1.png"
      ),
      "utf8"
    )
  ).toBe("binary");
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "analytics", "posts.json"),
      "utf8"
    )
  ).toBe("[]");
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "analytics", "imports", "export.xlsx"),
      "utf8"
    )
  ).toBe("binary");
  expect(
    await readFile(
      path.join(
        dataDir,
        "example-agency",
        "analytics",
        "imports",
        "processed",
        "old-export.xlsx"
      ),
      "utf8"
    )
  ).toBe("binary");

  // example-personal moved (partial: only setup + content existed)
  expect(
    await readFile(
      path.join(dataDir, "example-personal", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice personal\n");
  expect(
    await readFile(
      path.join(dataDir, "example-personal", "content", "items", "def.json"),
      "utf8"
    )
  ).toBe("{}");
  expect(await exists(path.join(dataDir, "example-personal", "work"))).toBe(false);
  expect(await exists(path.join(dataDir, "example-personal", "analytics"))).toBe(
    false
  );

  // globals moved to shared/
  expect(await readFile(path.join(dataDir, "shared", "intake.md"), "utf8")).toBe(
    "# global intake\n"
  );
  expect(
    await readFile(path.join(dataDir, "shared", "content-library.json"), "utf8")
  ).toBe("[]");
  expect(
    await readFile(path.join(dataDir, "shared", "analytics-review.json"), "utf8")
  ).toBe("{}");

  // old type-root dirs removed since empty after moves
  expect(await exists(path.join(dataDir, "setup"))).toBe(false);
  expect(await exists(path.join(dataDir, "work"))).toBe(false);
  expect(await exists(path.join(dataDir, "content"))).toBe(false);
  expect(await exists(path.join(dataDir, "analytics"))).toBe(false);

  // unmanaged dirs untouched
  expect(
    await readFile(path.join(dataDir, "brands", "acme.md"), "utf8")
  ).toBe("# acme\n");
  expect(
    await readFile(path.join(dataDir, "tenants", "registry.json"), "utf8")
  ).toBe("[]");

  expect(summary.moves.length).toBeGreaterThan(0);
});

test("second run is a no-op with a clean summary", async () => {
  await writeOldLayoutFixture(dataDir);
  await migrate(dataDir, { dryRun: false });

  const second = await migrate(dataDir, { dryRun: false });

  expect(second.aborted).toBe(false);
  expect(second.conflicts).toEqual([]);
  expect(second.moves).toEqual([]);
});

test("conflicting destination aborts pre-flight with nothing moved", async () => {
  await writeOldLayoutFixture(dataDir);

  // pre-create a conflicting destination with different content
  await mkdir(path.join(dataDir, "example-agency", "setup"), { recursive: true });
  await writeFile(
    path.join(dataDir, "example-agency", "setup", "voice.md"),
    "# DIFFERENT CONTENT\n"
  );

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(true);
  expect(summary.conflicts.length).toBeGreaterThan(0);

  // nothing moved: old layout paths still intact
  expect(
    await readFile(
      path.join(dataDir, "work", "example-agency", "campaigns", "q1.md"),
      "utf8"
    )
  ).toBe("# q1 campaign\n");
  expect(
    await readFile(
      path.join(dataDir, "content", "example-agency", "items", "abc.json"),
      "utf8"
    )
  ).toBe("{}");
  expect(
    await readFile(
      path.join(dataDir, "analytics", "example-agency", "posts.json"),
      "utf8"
    )
  ).toBe("[]");
  // the conflicting file itself remains as pre-created (not overwritten)
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# DIFFERENT CONTENT\n");
});

test("--dry-run reports planned moves without acting", async () => {
  await writeOldLayoutFixture(dataDir);

  const summary = await migrate(dataDir, { dryRun: true });

  expect(summary.aborted).toBe(false);
  expect(summary.dryRun).toBe(true);
  expect(summary.moves.length).toBeGreaterThan(0);

  // nothing actually moved
  expect(await exists(path.join(dataDir, "example-agency"))).toBe(false);
  expect(
    await readFile(
      path.join(dataDir, "setup", "example-agency", "voice.md"),
      "utf8"
    )
  ).toBe("# voice\n");
  expect(await exists(path.join(dataDir, "shared"))).toBe(false);
});

test("identical destination content is skipped and reported, not treated as conflict", async () => {
  await writeOldLayoutFixture(dataDir);
  await migrate(dataDir, { dryRun: false });

  // Re-create the old layout for example-agency's setup dir with identical content
  // (simulates a partial re-run scenario) alongside the already-migrated tenant.
  await mkdir(path.join(dataDir, "setup", "example-agency"), { recursive: true });
  await writeFile(
    path.join(dataDir, "setup", "example-agency", "voice.md"),
    "# voice\n"
  );

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(false);
  expect(summary.conflicts).toEqual([]);
  expect(summary.skipped.length).toBeGreaterThan(0);
  // old setup/example-agency removed since content was identical and now redundant
  expect(await exists(path.join(dataDir, "setup"))).toBe(false);
  // the destination content survives untouched and re-readable after the skip
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice\n");
});

test("a tenant name colliding with a reserved directory aborts pre-flight with nothing moved", async () => {
  await writeOldLayoutFixture(dataDir);

  // "shared" is reserved: it's the script's own global destination.
  await mkdir(path.join(dataDir, "setup", "shared"), { recursive: true });
  await writeFile(path.join(dataDir, "setup", "shared", "voice.md"), "# voice\n");

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(true);
  expect(summary.reason).toBe("reserved-name");
  expect(summary.reservedNames).toContain("shared");

  // nothing moved: old layout paths still intact, including the unrelated tenant
  expect(
    await readFile(
      path.join(dataDir, "work", "example-agency", "campaigns", "q1.md"),
      "utf8"
    )
  ).toBe("# q1 campaign\n");
  expect(await exists(path.join(dataDir, "example-agency"))).toBe(false);
  expect(await exists(path.join(dataDir, "shared"))).toBe(false);
});

test.each(["shared", "tenants", "imports", "brands", "guides", "research", "accounts", "campaigns", "assets", "generated"])(
  "reserved name '%s' aborts discovery pre-flight",
  async (reservedName) => {
    await mkdir(path.join(dataDir, "setup", reservedName), { recursive: true });
    await writeFile(
      path.join(dataDir, "setup", reservedName, "voice.md"),
      "# voice\n"
    );

    const summary = await migrate(dataDir, { dryRun: false });

    expect(summary.aborted).toBe(true);
    expect(summary.reason).toBe("reserved-name");
    expect(summary.reservedNames).toContain(reservedName);
  }
);

test("an invalid (non-kebab) tenant name aborts pre-flight with nothing moved", async () => {
  await writeOldLayoutFixture(dataDir);

  // "Example_Corp" is not lowercase kebab, matching the app's isValidTenantId rule.
  await mkdir(path.join(dataDir, "setup", "Example_Corp"), { recursive: true });
  await writeFile(
    path.join(dataDir, "setup", "Example_Corp", "voice.md"),
    "# voice\n"
  );

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(true);
  expect(summary.reason).toBe("invalid-name");
  expect(summary.invalidNames).toContain("Example_Corp");

  // nothing moved
  expect(
    await readFile(
      path.join(dataDir, "work", "example-agency", "campaigns", "q1.md"),
      "utf8"
    )
  ).toBe("# q1 campaign\n");
  expect(await exists(path.join(dataDir, "example-agency"))).toBe(false);
});

test("a tenant that exists only under data/analytics/imports/<tenant> is discovered and migrated", async () => {
  await mkdir(
    path.join(dataDir, "analytics", "imports", "example-imports-only", "processed"),
    { recursive: true }
  );
  await writeFile(
    path.join(dataDir, "analytics", "imports", "example-imports-only", "export.xlsx"),
    "binary"
  );

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(false);
  expect(summary.tenants).toContain("example-imports-only");
  expect(
    await readFile(
      path.join(
        dataDir,
        "example-imports-only",
        "analytics",
        "imports",
        "export.xlsx"
      ),
      "utf8"
    )
  ).toBe("binary");
  // no setup/work/content ever existed for this tenant
  expect(await exists(path.join(dataDir, "example-imports-only", "setup"))).toBe(
    false
  );
});

test("a failure mid-execution reports partial progress and rethrows without silently losing state", async () => {
  await writeOldLayoutFixture(dataDir);

  // Sabotage one of the planned moves so it fails mid-loop. Moves are planned
  // per-tenant in a fixed candidate order (setup, work, content, analytics,
  // imports) and tenants are visited in sorted order, so example-agency's
  // setup move (the first candidate for the first tenant) always executes
  // before example-personal's moves.
  //
  // Block example-personal's setup destination by placing a plain file at
  // dataDir/example-personal (the parent directory fs.mkdir needs to create
  // for that move), so its move throws with example-agency's earlier moves
  // already completed.
  await writeFile(path.join(dataDir, "example-personal"), "blocking file");

  let caught: unknown;
  try {
    await migrate(dataDir, { dryRun: false });
    throw new Error("expected migrate() to reject");
  } catch (err) {
    caught = err;
  }

  // The thrown error carries a partial-progress report so the caller (the
  // CLI entrypoint) can print what happened before exiting nonzero, instead
  // of an unadorned throw with no visibility into what was and wasn't moved.
  expect(caught).toBeInstanceOf(MigrationExecutionError);
  const migrationErr = caught as InstanceType<typeof MigrationExecutionError>;
  expect(migrationErr.partialSummary).toBeTruthy();
  expect(migrationErr.partialSummary.completed.length).toBeGreaterThan(0);
  expect(
    migrationErr.partialSummary.completed.some(
      (m) => m.tenant === "example-agency"
    )
  ).toBe(true);
  expect(migrationErr.partialSummary.failed).toBeTruthy();
  expect(migrationErr.partialSummary.failed.move.tenant).toBe(
    "example-personal"
  );
  expect(migrationErr.partialSummary.failed.error).toBeTruthy();
  expect(migrationErr.partialSummary.notAttempted.length).toBeGreaterThan(0);

  // example-agency's setup move (planned before example-personal's) completed.
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice\n");

  // example-personal was never migrated: the blocking file is still there
  // and the old source is untouched.
  expect(
    await readFile(path.join(dataDir, "example-personal"), "utf8")
  ).toBe("blocking file");
  expect(
    await readFile(
      path.join(dataDir, "setup", "example-personal", "voice.md"),
      "utf8"
    )
  ).toBe("# voice personal\n");
});

test("idempotent re-run after a mid-run failure completes correctly", async () => {
  await writeOldLayoutFixture(dataDir);
  await writeFile(path.join(dataDir, "example-personal"), "blocking file");

  await expect(migrate(dataDir, { dryRun: false })).rejects.toThrow();

  // Clear the obstruction, as a human fixing the failure would, then re-run.
  await rm(path.join(dataDir, "example-personal"), { force: true });

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(false);
  expect(summary.conflicts).toEqual([]);

  // Both tenants fully migrated, including the moves that succeeded on the
  // first (failed) run and those that were retried on the second.
  expect(
    await readFile(
      path.join(dataDir, "example-agency", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice\n");
  expect(
    await readFile(
      path.join(dataDir, "example-personal", "setup", "voice.md"),
      "utf8"
    )
  ).toBe("# voice personal\n");
  expect(
    await readFile(
      path.join(dataDir, "example-personal", "content", "items", "def.json"),
      "utf8"
    )
  ).toBe("{}");
  expect(await exists(path.join(dataDir, "setup"))).toBe(false);
  expect(await exists(path.join(dataDir, "content"))).toBe(false);
});

test("unmanaged top-level dirs are left untouched when no tenants exist", async () => {
  await mkdir(path.join(dataDir, "brands"), { recursive: true });
  await writeFile(path.join(dataDir, "brands", "acme.md"), "# acme\n");
  await mkdir(path.join(dataDir, "generated"), { recursive: true });

  const summary = await migrate(dataDir, { dryRun: false });

  expect(summary.aborted).toBe(false);
  expect(summary.moves).toEqual([]);
  expect(
    await readFile(path.join(dataDir, "brands", "acme.md"), "utf8")
  ).toBe("# acme\n");
  expect(await exists(path.join(dataDir, "generated"))).toBe(true);
});
