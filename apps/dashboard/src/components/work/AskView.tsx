import { CAPABILITIES, promptFor } from "@/lib/capabilities";
import { CopyPrompt } from "@/components/content/CopyPrompt";

interface AskViewProps {
  tenantName: string;
}

export function AskView({ tenantName }: AskViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="ws-slate" style={{ fontSize: 13 }}>
        Ask your agent to run any capability:
      </p>
      <p className="ws-slate ws-soft" style={{ fontSize: 12 }}>
        A good starting order for a new brand is research, then keywords, then strategy, then
        campaigns, with analytics once posts are live. They are ongoing, so run any of them
        whenever you need it.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {CAPABILITIES.map((capability) => (
          <div key={capability.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="ws-label">{capability.label}</div>
            <p className="ws-slate" style={{ fontSize: 12 }}>
              {capability.description}
            </p>
            <CopyPrompt prompt={promptFor(capability, tenantName)} />
          </div>
        ))}
      </div>
    </div>
  );
}
