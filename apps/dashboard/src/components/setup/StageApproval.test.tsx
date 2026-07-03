// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageApproval } from "./StageApproval.js";
import { stageById } from "@/lib/initStages";

test("shows Approve and a refine prompt for an agent stage", () => {
  const onApprove = vi.fn();
  render(<StageApproval tenantName="Example Agency" stage={stageById("icp")!} onApprove={onApprove} />);

  const approve = screen.getByRole("button", { name: /Approve ICP/i });
  fireEvent.click(approve);
  expect(onApprove).toHaveBeenCalledOnce();

  expect(screen.getByText(/Evaluate and refine Init step "icp" \(ICP\) for Example Agency/)).toBeTruthy();
});

test("omits the refine prompt for the no-agent intake stage", () => {
  render(<StageApproval tenantName="Example Agency" stage={stageById("import-intake")!} onApprove={() => {}} />);
  expect(screen.getByRole("button", { name: /Approve Import & intake/i })).toBeTruthy();
  expect(screen.queryByText(/Evaluate and refine/)).toBeNull();
});
