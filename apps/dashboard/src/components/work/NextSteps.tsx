import type { Capability } from "@/lib/capabilities";
import { promptFor } from "@/lib/capabilities";
import { CopyPrompt } from "@/components/content/CopyPrompt";

interface NextStepsProps {
  tenantName: string;
  outstanding: Capability[];
}

export function NextSteps({ tenantName, outstanding }: NextStepsProps) {
  if (outstanding.length === 0) return null;

  return (
    <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div className="ws-label">Next steps</div>
        <p className="ws-slate" style={{ fontSize: 12 }}>
          Setup is done. These are the prep pieces the agent should do next.
        </p>
      </div>
      {outstanding.map((cap) => (
        <div key={cap.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="ws-label">{cap.label}</div>
          <p className="ws-slate" style={{ fontSize: 12 }}>
            {cap.description}
          </p>
          <CopyPrompt prompt={promptFor(cap, tenantName)} />
        </div>
      ))}
    </div>
  );
}
