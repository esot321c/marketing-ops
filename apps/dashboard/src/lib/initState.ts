import { STAGES, stageById } from "./initStages.js";
import type { InitState, StageId, StageStatus } from "./types.js";

export const STATUSES: StageStatus[] = ["not-started", "in-progress", "in-review", "approved"];

export function createInitState(tenantId: string): InitState {
  const stages = {} as Record<StageId, { status: StageStatus; artifactPath: string | null; approvedAt: string | null }>;
  STAGES.forEach((stage, index) => {
    stages[stage.id] = {
      status: index === 0 ? "in-progress" : "not-started",
      artifactPath: null,
      approvedAt: null,
    };
  });
  return { tenantId, stages };
}

/**
 * @param now ISO timestamp recorded as approvedAt when approving.
 */
export function setStageStatus(
  state: InitState,
  stageId: StageId,
  status: StageStatus,
  now: string | null = null
): InitState {
  if (!stageById(stageId)) throw new Error(`Unknown stage: ${stageId}`);
  if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  const prev = state.stages[stageId] ?? { artifactPath: null, approvedAt: null };
  return {
    ...state,
    stages: {
      ...state.stages,
      [stageId]: {
        ...prev,
        status,
        approvedAt: status === "approved" ? (now ?? prev.approvedAt) : prev.approvedAt,
      },
    },
  };
}

export function canEnterStage(state: InitState, stageId: StageId): boolean {
  const index = STAGES.findIndex((s) => s.id === stageId);
  if (index <= 0) return index === 0; // first stage always enterable; unknown => false
  const previous = STAGES[index - 1];
  if (!previous) return false;
  return state.stages[previous.id]?.status === "approved";
}

export function isReadyToPost(state: InitState): boolean {
  return STAGES.every((s) => state.stages[s.id]?.status === "approved");
}
