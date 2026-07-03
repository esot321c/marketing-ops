// Canonical, design-first Init sequence. `type` drives the wizard card:
// "input" = forms/uploads the user fills; "review" = the agent produces an
// artifact the user approves. `needsAgent` stages show a copy-paste handoff.
import type { StageId, StageDef } from "./types.js";

export const STAGES: StageDef[] = [
  { id: "import-intake", label: "Import & intake", type: "input", needsAgent: false },
  { id: "design-system", label: "Design style & Design System", type: "review", needsAgent: true },
  { id: "voice", label: "Voice / copy", type: "input", needsAgent: true },
  { id: "icp", label: "ICP", type: "input", needsAgent: true },
  { id: "vertical", label: "Vertical", type: "input", needsAgent: true },
  { id: "competitor-research", label: "Competitor research", type: "review", needsAgent: true },
  { id: "profile-build", label: "Profile build", type: "review", needsAgent: true },
];

export function stageById(id: string): StageDef | null {
  return STAGES.find((s) => s.id === id) ?? null;
}

export function handoffPromptFor(stageId: StageId, tenantName: string): string | null {
  const stage = stageById(stageId);
  if (!stage || !stage.needsAgent) return null;
  return `Run Init step "${stage.id}" (${stage.label}) for ${tenantName}`;
}
