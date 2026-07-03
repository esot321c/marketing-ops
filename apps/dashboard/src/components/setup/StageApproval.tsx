import { refinePromptFor } from "@/lib/initStages";
import { CopyPrompt } from "@/components/content/CopyPrompt";
import type { StageDef } from "@/lib/types";

export interface StageApprovalProps {
  tenantName: string;
  stage: StageDef;
  onApprove: () => void;
}

// Shown when a stage is saved (in-review): the user can approve it now, or check
// in with chat to evaluate and refine the saved artifact first. The refine prompt
// is omitted for stages with no agent (nothing for chat to refine).
export function StageApproval({ tenantName, stage, onApprove }: StageApprovalProps) {
  const refinePrompt = refinePromptFor(stage.id, tenantName);
  return (
    <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="ws-soft" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Saved, not yet approved. You can approve it now, or check in with chat to evaluate and refine it first.
      </p>
      <button
        type="button"
        className="ws-btn ws-btn-primary"
        onClick={onApprove}
        style={{ width: "100%", justifyContent: "center" }}
      >
        Approve {stage.label}
      </button>
      {refinePrompt !== null ? (
        <>
          <div className="ws-slate" style={{ textAlign: "center", fontSize: 12 }}>or</div>
          <CopyPrompt prompt={refinePrompt} />
        </>
      ) : null}
    </div>
  );
}
