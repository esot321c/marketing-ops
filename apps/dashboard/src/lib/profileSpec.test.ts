// apps/dashboard/src/lib/profileSpec.test.ts
import { test, expect } from "vitest";
import {
  createProfileSpec,
  canTransition,
  setProfileState,
  validateProfileSpec,
  PROFILE_STATES,
} from "./profileSpec.js";

test("createProfileSpec starts in drafting with the required sections", () => {
  const spec = createProfileSpec("example-agency", "linkedin");
  expect(spec.tenantId).toBe("example-agency");
  expect(spec.channel).toBe("linkedin");
  expect(spec.state).toBe("drafting");
  for (const key of ["banner", "headline", "tagline", "about", "featured", "applyChecklist"]) {
    expect(key in spec.sections).toBeTruthy();
  }
});

test("canTransition only allows the linear path", () => {
  expect(canTransition("drafting", "in_review")).toBe(true);
  expect(canTransition("in_review", "approved")).toBe(true);
  expect(canTransition("approved", "applied")).toBe(true);
  expect(canTransition("drafting", "applied")).toBe(false);
  expect(canTransition("approved", "drafting")).toBe(false);
});

test("setProfileState enforces the linear path and is immutable", () => {
  const spec = createProfileSpec("example-agency", "linkedin");
  const next = setProfileState(spec, "in_review");
  expect(spec.state).toBe("drafting");
  expect(next.state).toBe("in_review");
  expect(() => setProfileState(spec, "applied")).toThrow();
});

test("validateProfileSpec flags an unknown state", () => {
  const spec = { ...createProfileSpec("example-agency", "linkedin"), state: "live" as never };
  const result = validateProfileSpec(spec);
  expect(result.ok).toBe(false);
  expect(PROFILE_STATES.length === 4).toBeTruthy();
});
