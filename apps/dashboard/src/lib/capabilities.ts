export interface Capability {
  id: string;
  label: string;
  description: string;
  folder: string;
  promptTemplate: string;
  skill: string;
  readOnly?: boolean;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "research",
    label: "Research",
    folder: "research",
    description: "See how competitors position, what they publish, and where the gaps are.",
    promptTemplate: "Run competitor research for {tenant}",
    skill: "market-research",
  },
  {
    id: "keywords",
    label: "SEO / Keywords",
    folder: "keywords",
    description: "Find the search terms and topics worth targeting.",
    promptTemplate: "Research keywords for {tenant}",
    skill: "market-research",
  },
  {
    id: "strategy",
    label: "Strategy",
    folder: "strategy",
    description: "Turn that research into a plan for your site, blog, and SEO.",
    promptTemplate: "Draft an SEO and content strategy for {tenant}",
    skill: "content-pipeline",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    folder: "campaigns",
    description: "Turn a goal into a coordinated push with a brief and a schedule.",
    promptTemplate: "Plan a campaign for {tenant}",
    skill: "marketing-ops",
  },
  {
    id: "analytics",
    label: "Analytics",
    folder: "analytics",
    description: "Review what performed and set the next actions.",
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
