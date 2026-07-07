import { describe, it, expect } from "vitest";
import { CAPABILITIES, capabilityById, promptFor, isCapabilityId } from "./capabilities.js";

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
});
