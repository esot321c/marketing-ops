export interface Capability {
  id: string;
  label: string;
  folder: string;
  promptTemplate: string;
  skill: string;
  readOnly?: boolean;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "campaigns",
    label: "Campaigns",
    folder: "campaigns",
    promptTemplate: "Plan a campaign for {tenant}",
    skill: "marketing-ops",
  },
  {
    id: "strategy",
    label: "Strategy",
    folder: "strategy",
    promptTemplate: "Draft an SEO and content strategy for {tenant}",
    skill: "content-pipeline",
  },
  {
    id: "keywords",
    label: "SEO / Keywords",
    folder: "keywords",
    promptTemplate: "Research keywords for {tenant}",
    skill: "market-research",
  },
  {
    id: "research",
    label: "Research",
    folder: "research",
    promptTemplate: "Run competitor research for {tenant}",
    skill: "market-research",
  },
  {
    id: "analytics",
    label: "Analytics",
    folder: "analytics",
    promptTemplate: "Review analytics for {tenant}",
    skill: "marketing-ops",
    readOnly: true,
  },
];

export function capabilityById(id: string): Capability | null {
  return CAPABILITIES.find((c) => c.id === id) ?? null;
}

export function promptFor(cap: Capability, tenantName: string): string {
  return cap.promptTemplate.replace("{tenant}", tenantName);
}

export function isCapabilityId(id: string): boolean {
  return CAPABILITIES.some((c) => c.id === id);
}
