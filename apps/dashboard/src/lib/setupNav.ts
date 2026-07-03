import { STAGES } from "./initStages.js";
import type { InitState, StageId, StageStatus } from "./types.js";

export type SetupStepStatus = "done" | "current" | "locked";
export interface SetupStep {
  stageId: StageId;
  label: string;
  status: SetupStepStatus;
}

// Short sidebar labels; the canonical STAGES labels are longer and wizard-phrased.
export const SETUP_LABELS: Record<StageId, string> = {
  "import-intake": "Import & intake",
  "design-system": "Brand & design",
  voice: "Voice",
  icp: "ICP",
  vertical: "Vertical",
  "competitor-research": "Competitors",
  "profile-build": "Profile",
};

export function setupSteps(state: InitState): SetupStep[] {
  let currentTaken = false;
  return STAGES.map((s) => {
    const status: StageStatus = state.stages[s.id]?.status ?? "not-started";
    let stepStatus: SetupStepStatus;
    if (status === "approved") {
      stepStatus = "done";
    } else if (!currentTaken) {
      stepStatus = "current";
      currentTaken = true;
    } else {
      stepStatus = "locked";
    }
    return { stageId: s.id, label: SETUP_LABELS[s.id], status: stepStatus };
  });
}

export function currentStepIndex(steps: SetupStep[]): number {
  return steps.findIndex((s) => s.status === "current");
}
