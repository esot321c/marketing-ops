import { test, expect } from "vitest";
import { resolveResearchAssetPath, researchAssetRoot } from "./researchAssets.js";

test("research asset resolver allows research vault paths", () => {
  const resolved = resolveResearchAssetPath("data/assets/research/linkedin/organic/example.png");

  expect(resolved).toBeTruthy();
  expect(resolved?.startsWith(researchAssetRoot)).toBeTruthy();
});

test("research asset resolver rejects non-research and traversal paths", () => {
  expect(resolveResearchAssetPath("data/assets/example-saas/logos/logo.png")).toBeNull();
  expect(resolveResearchAssetPath("../data/assets/research/example.png")).toBeNull();
  expect(resolveResearchAssetPath("data/assets/research/../../setup/intake.md")).toBeNull();
});
