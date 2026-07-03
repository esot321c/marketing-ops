export type StageId =
  | "import-intake" | "icp" | "vertical" | "competitor-research" | "design-system" | "voice" | "profile-build";
export type StageStatus = "not-started" | "in-progress" | "in-review" | "approved";
export type StageType = "input" | "review";
export interface StageDef { id: StageId; label: string; type: StageType; needsAgent: boolean; }
export interface StageState { status: StageStatus; artifactPath: string | null; approvedAt: string | null; }
export interface InitState { tenantId: string; stages: Record<StageId, StageState>; }
export type ProfileChannel = "linkedin";
export type ProfileStateName = "drafting" | "in_review" | "approved" | "applied";
export interface ProfileSpec { tenantId: string; channel: ProfileChannel; state: ProfileStateName; sections: Record<string, unknown>; }
export interface TenantSummary { id: string; name: string; }
