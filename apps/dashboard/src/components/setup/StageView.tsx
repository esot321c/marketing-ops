import { stageById } from "@/lib/initStages";
import { IntakeForm } from "@/components/IntakeForm";
import { StageInputForm } from "@/components/StageInputForm";
import { ReviewCard } from "@/components/ReviewCard";
import { StageArtifact } from "@/components/StageArtifact";
import { DesignSystemPanel } from "@/components/DesignSystemPanel";
import type { StageId, StageStatus } from "@/lib/types";

export interface StageViewProps {
  tenant: string;
  tenantName: string;
  stageId: StageId;
  status: StageStatus;
  onApprove: () => void;
  onChanged: () => void;
}

export function StageView({ tenant, tenantName, stageId, status, onApprove, onChanged }: StageViewProps) {
  const def = stageById(stageId);
  if (!def) return null;

  // Brand & design: the actual design system renders inline, then the review/approve card.
  if (stageId === "design-system") {
    return (
      <div className="space-y-4">
        <DesignSystemPanel tenant={tenant} />
        <ReviewCard tenantName={tenantName} stage={def} status={status} onApprove={onApprove} />
      </div>
    );
  }

  if (def.type === "input") {
    const form =
      stageId === "import-intake" ? (
        <IntakeForm tenant={tenant} onSaved={onChanged} />
      ) : (
        <StageInputForm tenant={tenant} stage={stageId} label={def.label} onSaved={onChanged} />
      );
    return (
      <div className="space-y-4">
        {form}
        {status === "in-review" && (
          <button type="button" className="ws-btn ws-btn-primary" onClick={onApprove} style={{ width: "100%", justifyContent: "center" }}>
            Approve {def.label}
          </button>
        )}
        <StageArtifact tenant={tenant} stage={stageId} />
      </div>
    );
  }

  // review stage (competitor-research, profile-build)
  return (
    <div className="space-y-4">
      <ReviewCard tenantName={tenantName} stage={def} status={status} onApprove={onApprove} />
      <StageArtifact tenant={tenant} stage={stageId} />
    </div>
  );
}
