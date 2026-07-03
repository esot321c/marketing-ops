// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceSidebar } from "./WorkspaceSidebar.js";
import { setupSteps } from "@/lib/setupNav";
import { STAGES } from "@/lib/initStages";
import type { InitState, StageStatus } from "@/lib/types";

function state(fn: (id: string) => StageStatus): InitState {
  const stages = Object.fromEntries(
    STAGES.map((s) => [s.id, { status: fn(s.id), artifactPath: null, approvedAt: null }])
  ) as InitState["stages"];
  return { tenantId: "t", stages };
}

test("ready mode shows Content group with Today", () => {
  const steps = setupSteps(state(() => "approved"));
  render(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" onSelect={() => {}} composerEnabled={false} />);
  expect(screen.getByText("Today")).toBeTruthy();
  expect(screen.getByText("Brand & design")).toBeTruthy();
});

test("guided mode shows the setup steps and a locked Content group", () => {
  const steps = setupSteps(state(() => "not-started"));
  render(<WorkspaceSidebar mode="guided" tenantName="Example Agency" steps={steps} section="import-intake" onSelect={() => {}} composerEnabled={false} />);
  expect(screen.getByText("Brand & design")).toBeTruthy();
  // current step is selectable, a later step is locked (disabled) — verifies the lock logic per step
  const intake = screen.getByRole("button", { name: /Import & intake/i }) as HTMLButtonElement;
  expect(intake.disabled).toBe(false);
  const vertical = screen.getByRole("button", { name: /Vertical/i }) as HTMLButtonElement;
  expect(vertical.disabled).toBe(true);
});
