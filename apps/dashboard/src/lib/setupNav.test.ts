import { test, expect } from "vitest";
import { setupSteps, currentStepIndex, SETUP_LABELS } from "./setupNav.js";
import { STAGES } from "./initStages.js";
import type { InitState, StageId, StageStatus } from "./types.js";

function state(overrides: Partial<Record<StageId, StageStatus>>): InitState {
  const stages = Object.fromEntries(
    STAGES.map((s) => [s.id, { status: overrides[s.id] ?? "not-started", artifactPath: null, approvedAt: null }])
  ) as InitState["stages"];
  return { tenantId: "t", stages };
}

test("all-not-started: first step is current, rest locked", () => {
  const steps = setupSteps(state({}));
  expect(steps[0]!.status).toBe("current");
  expect(steps.slice(1).every((s) => s.status === "locked")).toBe(true);
  expect(currentStepIndex(steps)).toBe(0);
});

test("approved prefix are done, first non-approved is current, rest locked", () => {
  const steps = setupSteps(state({ "import-intake": "approved", icp: "approved" }));
  expect(steps[0]!.status).toBe("done");
  expect(steps[1]!.status).toBe("done");
  expect(steps[2]!.status).toBe("current");
  expect(steps[3]!.status).toBe("locked");
  expect(currentStepIndex(steps)).toBe(2);
});

test("all approved: every step done, no current", () => {
  const all = Object.fromEntries(STAGES.map((s) => [s.id, "approved" as StageStatus]));
  const steps = setupSteps(state(all));
  expect(steps.every((s) => s.status === "done")).toBe(true);
  expect(currentStepIndex(steps)).toBe(-1);
});

test("in-progress / in-review are treated as not-approved (current, then locked)", () => {
  const steps = setupSteps(state({ "import-intake": "approved", icp: "in-review" }));
  expect(steps[0]!.status).toBe("done");     // import-intake approved
  expect(steps[1]!.status).toBe("current");  // icp in-review -> first non-approved -> current
  expect(steps[2]!.status).toBe("locked");
});

test("labels exist for every stage and are short", () => {
  for (const s of STAGES) expect(typeof SETUP_LABELS[s.id]).toBe("string");
  expect(SETUP_LABELS["design-system"]).toBe("Brand & design");
});
