import { mkdir, writeFile, rm, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect, beforeEach, afterEach } from "vitest";
import { migrate } from "../../../../scripts/migrate-tenant-first.mjs";

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
