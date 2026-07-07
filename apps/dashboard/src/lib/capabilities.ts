export interface Capability {
  id: string;
  label: string;
  description: string;
  promptTemplate: string;
  prep?: boolean;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "research",
    label: "Research",
    description: "See how competitors position, what they publish, and where the gaps are.",
    promptTemplate: "Run competitor research for {tenant}",
    prep: true,
  },
  {
    id: "keywords",
    label: "SEO / Keywords",
    description: "Find the search terms and topics worth targeting.",
    promptTemplate: "Research keywords for {tenant}",
    prep: true,
  },
  {
    id: "strategy",
    label: "Strategy",
    description: "Turn that research into a plan for your site, blog, and SEO.",
    promptTemplate: "Draft an SEO and content strategy for {tenant}",
    prep: true,
  },
  {
    id: "campaigns",
    label: "Campaigns",
    description: "Turn a goal into a coordinated push with a brief and a schedule.",
    promptTemplate: "Plan a campaign for {tenant}",
    prep: true,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Review what performed and set the next actions.",
    promptTemplate: "Review analytics for {tenant}",
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

// prep capabilities, in registry order
export function prepCapabilities(): Capability[] {
  return CAPABILITIES.filter((c) => c.prep === true);
}

// prep capabilities whose count is 0 or missing, in registry order
export function outstandingPrep(counts: Record<string, number>): Capability[] {
  return prepCapabilities().filter((c) => (counts[c.id] ?? 0) === 0);
}

// for a given capability, the prep capabilities BEFORE it in order whose count is 0/missing
export function priorPrepMissing(
  capabilityId: string,
  counts: Record<string, number>
): Capability[] {
  const prep = prepCapabilities();
  const index = prep.findIndex((c) => c.id === capabilityId);
  if (index === -1) return [];
  return prep.slice(0, index).filter((c) => (counts[c.id] ?? 0) === 0);
}
