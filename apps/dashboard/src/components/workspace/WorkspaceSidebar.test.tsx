// @vitest-environment jsdom
import { test, expect, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar.js";
import { SIDEBAR_COLLAPSED_KEY } from "./sidebarCollapse";
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

test("ready mode shows the Work group with a Campaigns link and an Ask link", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);
  const campaigns = screen.getByRole("link", { name: /Campaigns/i }) as HTMLAnchorElement;
  expect(campaigns.getAttribute("href")).toBe("/campaigns?tenant=t");
  const ask = screen.getByRole("link", { name: /Ask/i }) as HTMLAnchorElement;
  expect(ask.getAttribute("href")).toBe("/ask?tenant=t");
});

test("ready mode marks an outstanding prep capability as to do, but not other Work items", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(
    <WorkspaceSidebar
      mode="ready"
      tenantName="Example Tenant"
      steps={steps}
      section="today"
      hrefFor={hrefFor}
      composerEnabled={false}
      outstanding={new Set(["research"])}
    />
  );
  const research = screen.getByRole("link", { name: /Research/i });
  expect(within(research).getByText("to do")).toBeTruthy();
  const campaigns = screen.getByRole("link", { name: /Campaigns/i });
  expect(within(campaigns).queryByText("to do")).toBeNull();
  expect(screen.getAllByText("to do")).toHaveLength(1);
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

beforeEach(() => {
  window.localStorage.clear();
});

test("collapse toggle hides the nav and flips its label to Expand sidebar", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);

  const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
  expect(screen.getByText("Today")).toBeTruthy();

  fireEvent.click(toggle);

  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
  expect(screen.queryByText("Today")).toBeNull();
});

test("clicking Expand sidebar restores the nav", () => {
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);

  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
  expect(screen.getByText("Today")).toBeTruthy();
});

test("reads the collapsed preference from localStorage on mount", () => {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
  const steps = setupSteps(state(() => "approved"));
  renderSidebar(<WorkspaceSidebar mode="ready" tenantName="Example Tenant" steps={steps} section="today" hrefFor={hrefFor} composerEnabled={false} />);

  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
  expect(screen.queryByText("Today")).toBeNull();
});

test("collapsing calls onCollapsedChange so the parent layout can widen the main area", () => {
  const steps = setupSteps(state(() => "approved"));
  let last: boolean | undefined;
  renderSidebar(
    <WorkspaceSidebar
      mode="ready"
      tenantName="Example Tenant"
      steps={steps}
      section="today"
      hrefFor={hrefFor}
      composerEnabled={false}
      onCollapsedChange={(collapsed) => { last = collapsed; }}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(last).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(last).toBe(false);
});
