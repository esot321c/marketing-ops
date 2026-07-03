import { test, expect } from "vitest";
import { STAGES, stageById, handoffPromptFor } from "./initStages.js";

test("there are seven ordered stages, design-first", () => {
  expect(STAGES.length).toBe(7);
  expect(STAGES.map((s) => s.id)).toEqual([
    "import-intake",
    "design-system",
    "voice",
    "icp",
    "vertical",
    "competitor-research",
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
