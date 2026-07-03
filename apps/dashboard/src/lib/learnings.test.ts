import { test, expect } from "vitest";
import { parseLearnings, pendingFirst, decide, applyCadenceTuning, newLearning } from "./learnings.js";
import type { Cadence, Learning } from "./contentTypes.js";

test("newLearning derives the gate and default status from the target", () => {
  const voice = newLearning({ source: "user-fact", observation: "o", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  expect(voice.gate).toBe("gated");
  expect(voice.status).toBe("pending");
  const cad = newLearning({ source: "performance", observation: "o", target: "cadence", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  expect(cad.gate).toBe("auto");
  expect(cad.status).toBe("auto-applied");
});

test("parseLearnings ignores blank and malformed lines", () => {
  const jsonl = `${JSON.stringify(newLearning({ source: "refine", observation: "o", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z"))}\n\n{bad`;
  expect(parseLearnings(jsonl)).toHaveLength(1);
});

test("pendingFirst surfaces pending gated learnings before decided ones", () => {
  const a: Learning = newLearning({ source: "refine", observation: "a", target: "voice", proposedChange: "c" }, "2026-07-01T00:00:00Z");
  const b: Learning = { ...newLearning({ source: "refine", observation: "b", target: "icp", proposedChange: "c" }, "2026-07-02T00:00:00Z"), status: "accepted" };
  expect(pendingFirst([b, a])[0]!.observation).toBe("a");
});

test("decide sets status and decidedAt", () => {
  const l = newLearning({ source: "refine", observation: "o", target: "voice", proposedChange: "c" }, "2026-07-01T00:00:00Z");
  const d = decide(l, "accepted", "2026-07-02T00:00:00Z");
  expect(d.status).toBe("accepted");
  expect(d.decidedAt).toBe("2026-07-02T00:00:00Z");
});

test("applyCadenceTuning changes the pillar weight and records an audit entry", () => {
  const cadence: Cadence = { tenantId: "example-personal", perWeek: {}, engagement: "d",
    pillars: [{ name: "reliability", weight: 2 }], updatedBy: [] };
  const next = applyCadenceTuning(cadence, "reliability", 1, "L1", "2026-07-02T00:00:00Z");
  expect(next.pillars[0]!.weight).toBe(3);
  expect(next.updatedBy).toHaveLength(1);
  expect(next.updatedBy[0]!.learningId).toBe("L1");
});

test("newLearning ids stay distinct across source and long-observation-suffix differences", () => {
  const a = newLearning({ source: "performance", observation: "engagement dropped", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  const b = newLearning({ source: "refine", observation: "engagement dropped", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  expect(a.id).not.toBe(b.id);
  const long = "x".repeat(80);
  const c = newLearning({ source: "refine", observation: long + "ONE", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  const d = newLearning({ source: "refine", observation: long + "TWO", target: "voice", proposedChange: "c" }, "2026-07-02T00:00:00Z");
  expect(c.id).not.toBe(d.id);
});
