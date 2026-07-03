import { test, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeInitState, readInitStateFrom, writeInitStateTo } from "./setupStore.js";
import { createInitState } from "./initState.js";
import type { InitState } from "./types.js";

test("writeInitStateTo then readInitStateFrom round-trips", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "init-"));
  const file = path.join(dir, "init.json");
  const state = createInitState("example-agency");
  await writeInitStateTo(file, state);
  const loaded = await readInitStateFrom<InitState>(file);
  expect(loaded?.tenantId).toBe("example-agency");
  expect(loaded?.stages["import-intake"].status).toBe("in-progress");
});

test("readInitStateFrom returns null when the file is missing", async () => {
  const loaded = await readInitStateFrom(path.join(os.tmpdir(), "does-not-exist-init.json"));
  expect(loaded).toBeNull();
});

test("writeInitState refuses an invalid tenant id", async () => {
  await expect(() => writeInitState("../escape", createInitState("x"))).rejects.toThrow();
});
