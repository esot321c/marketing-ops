import type { AgentAction } from "./contentTypes.js";

export function contentInstruction(action: AgentAction, tenantName: string, ref?: string): string {
  switch (action) {
    case "fulfil-request":
      return `Fulfil content request "${ref ?? ""}" for ${tenantName}`;
    case "refine":
      return `Refine content item "${ref ?? ""}" for ${tenantName}`;
    case "apply-learning":
      return `Apply learning "${ref ?? ""}" for ${tenantName}`;
    case "draft-suggestion":
      return `Draft the next suggested content piece for ${tenantName}`;
  }
}
