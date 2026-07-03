import { handoffPromptFor } from "@/lib/initStages";
import { CopyPrompt } from "@/components/content/CopyPrompt";
import { StageApproval } from "@/components/setup/StageApproval";
import type { StageDef, StageStatus } from "@/lib/types";

export interface ReviewCardProps {
  tenantName: string;
  stage: StageDef;
  status: StageStatus;
  onApprove: () => void;
}

export function ReviewCard({ tenantName, stage, status, onApprove }: ReviewCardProps) {
  // Once a saved artifact exists, offer the shared approve-or-refine affordance;
  // before that, the handoff prompt below is how the agent gets kicked off.
  if (status === "in-review") {
    return <StageApproval tenantName={tenantName} stage={stage} onApprove={onApprove} />;
  }
  const prompt = handoffPromptFor(stage.id, tenantName);
  return (
    <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="ws-serif ws-ink" style={{ fontSize: 15, fontWeight: 600 }}>{stage.label}</span>
        <span className="ws-pill ws-pill-mono">{status}</span>
      </div>
      {prompt !== null ? <CopyPrompt prompt={prompt} /> : null}
      <button type="button" className="ws-btn ws-btn-primary" onClick={onApprove} style={{ width: "100%", justifyContent: "center" }}>
        Approve {stage.label}
      </button>
    </div>
  );
}
