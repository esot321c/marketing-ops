import { test, expect } from "vitest";
import {
  createInitState,
  setStageStatus,
  canEnterStage,
  isReadyToPost,
  STATUSES,
} from "./initState.js";
import type { StageId } from "./types.js";

test("createInitState starts stage 1 in-progress, the rest not-started", () => {
  const s = createInitState("example-agency");
  expect(s.tenantId).toBe("example-agency");
  expect(s.stages["import-intake"].status).toBe("in-progress");
  expect(s.stages["profile-build"].status).toBe("not-started");
});

test("setStageStatus rejects unknown stage or status", () => {
  const s = createInitState("example-agency");
  expect(() => setStageStatus(s, "nope" as StageId, "approved")).toThrow();
  expect(() => setStageStatus(s, "voice", "done" as never)).toThrow();
});

test("setStageStatus is immutable and records approvedAt on approval", () => {
  const s = createInitState("example-agency");
  const s2 = setStageStatus(s, "import-intake", "approved", "2026-06-26T00:00:00Z");
  expect(s.stages["import-intake"].status).toBe("in-progress"); // original untouched
  expect(s2.stages["import-intake"].status).toBe("approved");
  expect(s2.stages["import-intake"].approvedAt).toBe("2026-06-26T00:00:00Z");
});

test("canEnterStage gates on the previous stage being approved", () => {
  let s = createInitState("example-agency");
  expect(canEnterStage(s, "import-intake")).toBe(true); // first is always enterable
  expect(canEnterStage(s, "icp")).toBe(false);
  s = setStageStatus(s, "import-intake", "approved");
  expect(canEnterStage(s, "icp")).toBe(true);
});

test("isReadyToPost only when all seven approved", () => {
  let s = createInitState("example-agency");
  expect(isReadyToPost(s)).toBe(false);
  for (const id of Object.keys(s.stages)) s = setStageStatus(s, id as StageId, "approved");
  expect(isReadyToPost(s)).toBe(true);
  expect(STATUSES.includes("approved")).toBeTruthy();
});
