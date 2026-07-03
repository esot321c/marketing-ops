import { test, expect } from "vitest";
import { STAGES, stageById, handoffPromptFor, refinePromptFor } from "./initStages.js";

test("there are seven ordered stages, strategy-first", () => {
  expect(STAGES.length).toBe(7);
  expect(STAGES.map((s) => s.id)).toEqual([
    "import-intake",
    "icp",
    "vertical",
    "competitor-research",
    "design-system",
    "voice",
    "profile-build",
  ]);
});

test("stageById returns the stage or null", () => {
  expect(stageById("voice")?.label).toBe("Voice / copy");
  expect(stageById("nope")).toBeNull();
});

test("handoffPromptFor names the step and tenant for agent stages", () => {
  const prompt = handoffPromptFor("design-system", "Example Agency");
  expect(prompt).toMatch(/Example Agency/);
  expect(prompt).toMatch(/design-system|design style/i);
});

test("refinePromptFor names the step and tenant for agent stages, null for intake", () => {
  const prompt = refinePromptFor("icp", "Example Agency");
  expect(prompt).toBe('Evaluate and refine Init step "icp" (ICP) for Example Agency');
  expect(refinePromptFor("import-intake", "Example Agency")).toBeNull();
});
