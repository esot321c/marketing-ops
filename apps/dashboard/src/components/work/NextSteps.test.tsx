// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextSteps } from "./NextSteps.js";
import { capabilityById } from "@/lib/capabilities";

test("lists outstanding prep capabilities with their run-prompts", () => {
  const research = capabilityById("research")!;
  render(<NextSteps tenantName="Example Agency" outstanding={[research]} />);

  expect(screen.getByText("Next steps")).toBeTruthy();
  expect(screen.getByText("Run competitor research for Example Agency")).toBeTruthy();
});

test("renders nothing when there is no outstanding prep", () => {
  const { container } = render(<NextSteps tenantName="Example Agency" outstanding={[]} />);
  expect(container.innerHTML).toBe("");
});
