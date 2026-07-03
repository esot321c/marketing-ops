// apps/dashboard/src/lib/profileSpec.ts
import type { ProfileSpec, ProfileStateName, ProfileChannel } from "./types.js";

export const PROFILE_STATES: ProfileStateName[] = ["drafting", "in_review", "approved", "applied"];

const SECTION_KEYS = ["banner", "headline", "tagline", "about", "logoAndVisual", "featured", "applyChecklist"];

export function createProfileSpec(tenantId: string, channel: ProfileChannel): ProfileSpec {
  const sections: Record<string, unknown> = {};
  for (const key of SECTION_KEYS) sections[key] = null;
  return { tenantId, channel, state: "drafting", sections };
}

export function canTransition(from: ProfileStateName, to: ProfileStateName): boolean {
  const fromIndex = PROFILE_STATES.indexOf(from);
  const toIndex = PROFILE_STATES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}

export function setProfileState(spec: ProfileSpec, to: ProfileStateName): ProfileSpec {
  if (!canTransition(spec.state, to)) {
    throw new Error(`Illegal profile transition: ${spec.state} -> ${to}`);
  }
  return { ...spec, state: to };
}

export function validateProfileSpec(spec: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!spec || typeof spec !== "object") return { ok: false, errors: ["not an object"] };
  const s = spec as Record<string, unknown>;
  if (typeof s["state"] !== "string" || !PROFILE_STATES.includes(s["state"] as ProfileStateName)) {
    errors.push(`unknown state: ${String(s["state"])}`);
  }
  if (!s["tenantId"]) errors.push("missing tenantId");
  if (!s["channel"]) errors.push("missing channel");
  return { ok: errors.length === 0, errors };
}
