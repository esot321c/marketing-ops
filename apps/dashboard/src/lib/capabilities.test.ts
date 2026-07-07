import { describe, it, expect } from "vitest";
import {
  CAPABILITIES,
  capabilityById,
  promptFor,
  isCapabilityId,
  prepCapabilities,
  outstandingPrep,
  priorPrepMissing,
} from "./capabilities.js";

describe("capabilities registry", () => {
  it("CAPABILITIES has exactly 5 entries", () => {
    expect(CAPABILITIES.length).toBe(5);
  });

  it("capabilityById finds campaigns by id", () => {
    expect(capabilityById("campaigns")?.label).toBe("Campaigns");
  });

  it("capabilityById returns null for unknown id", () => {
    expect(capabilityById("nope")).toBe(null);
  });

  it("promptFor replaces {tenant} placeholder", () => {
    const cap = capabilityById("campaigns")!;
    expect(promptFor(cap, "Example Agency")).toBe("Plan a campaign for Example Agency");
  });

  it("isCapabilityId returns true for valid id", () => {
    expect(isCapabilityId("analytics")).toBe(true);
  });

  it("isCapabilityId returns false for invalid id", () => {
    expect(isCapabilityId("today")).toBe(false);
  });

  it("every capability has a non-empty description", () => {
    for (const capability of CAPABILITIES) {
      expect(typeof capability.description).toBe("string");
      expect(capability.description.length).toBeGreaterThan(0);
    }
  });
});

describe("prep capabilities", () => {
  it("prepCapabilities returns research, keywords, strategy, campaigns (analytics excluded)", () => {
    expect(prepCapabilities().map((c) => c.id)).toEqual([
      "research",
      "keywords",
      "strategy",
      "campaigns",
    ]);
  });

  it("outstandingPrep returns all four prep ids when counts is empty", () => {
    expect(outstandingPrep({}).map((c) => c.id)).toEqual([
      "research",
      "keywords",
      "strategy",
      "campaigns",
    ]);
  });

  it("outstandingPrep returns [] when every prep capability has a count", () => {
    expect(
      outstandingPrep({ research: 2, keywords: 1, strategy: 1, campaigns: 1 })
    ).toEqual([]);
  });

  it("priorPrepMissing('campaigns', { research: 1 }) returns keywords and strategy", () => {
    expect(
      priorPrepMissing("campaigns", { research: 1 }).map((c) => c.id)
    ).toEqual(["keywords", "strategy"]);
  });

  it("priorPrepMissing('research', {}) returns []", () => {
    expect(priorPrepMissing("research", {})).toEqual([]);
  });

  it("priorPrepMissing('analytics', {}) returns [] because analytics is not prep", () => {
    expect(priorPrepMissing("analytics", {})).toEqual([]);
  });
});
