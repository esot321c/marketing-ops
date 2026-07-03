// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
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

const hrefFor = (s: string) => `/${s}?tenant=t`;

function renderSidebar(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

test("ready mode shows Content group with Today", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);
  expect(screen.getByText("Today")).toBeTruthy();
  expect(screen.getByText("Brand & design")).toBeTruthy();
});

test("enabled nav items are links that carry the tenant query", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);
  const today = screen.getByRole("link", { name: /Today/i });
  expect(today.getAttribute("href")).toBe("/today?tenant=t");
});

test("guided mode: the current step is a link, a later step is a disabled button", () => {
  const steps = setupSteps(state(() => "not-started"));
  renderSidebar(<WorkspaceSidebar mode="guided" tenantName="Example Agency" steps={steps} section="import-intake" hrefFor={hrefFor} composerEnabled={false} />);
  expect(screen.getByText("Brand & design")).toBeTruthy();
  // current step (import-intake) is enabled -> a real link
  expect(screen.getByRole("link", { name: /Import & intake/i })).toBeTruthy();
  // a later, locked step is a disabled button (non-navigable)
  const vertical = screen.getByRole("button", { name: /Vertical/i }) as HTMLButtonElement;
  expect(vertical.disabled).toBe(true);
});
