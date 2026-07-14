import type { AgentAction } from "./contentTypes.js";

export function contentInstruction(action: AgentAction, tenantName: string, ref?: string, note?: string): string {
  switch (action) {
    case "fulfil-request":
      return `Fulfil content request "${ref ?? ""}" for ${tenantName}`;
    case "refine": {
      const base = `Refine content item "${ref ?? ""}" for ${tenantName}.`;
      return note && note.trim()
        ? `${base} Queued refine note: "${note.trim()}".`
        : `${base} No refine note queued.`;
    }
    case "apply-learning":
      return `Apply learning "${ref ?? ""}" for ${tenantName}`;
    case "draft-suggestion":
      return `Draft the next suggested content piece for ${tenantName}`;
  }
}

export function latestPendingRefineNote(
  refineLog: { instruction: string; summary: string }[],
): string | undefined {
  for (let i = refineLog.length - 1; i >= 0; i--) {
    if (refineLog[i]!.summary === "pending") return refineLog[i]!.instruction;
  }
  return undefined;
}
