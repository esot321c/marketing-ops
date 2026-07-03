import type { Cadence, Learning, LearningSource, LearningTarget } from "./contentTypes.js";
import { gateFor } from "./contentTypes.js";

interface NewLearningFields {
  source: LearningSource;
  observation: string;
  target: LearningTarget;
  proposedChange: string;
}

function hashFields(...parts: string[]): string {
  let h = 0x811c9dc5;
  const s = parts.join(" ");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function newLearning(fields: NewLearningFields, atISO: string): Learning {
  const gate = gateFor(fields.target);
  const stamp = atISO.replace(/[^a-zA-Z0-9]/g, "");
  const id = `${stamp}-${fields.target}-${hashFields(fields.source, fields.observation, fields.proposedChange)}`;
  return {
    id, at: atISO, gate,
    status: gate === "auto" ? "auto-applied" : "pending",
    ...fields,
  };
}

export function parseLearnings(jsonl: string): Learning[] {
  const out: Learning[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      const parsed = JSON.parse(trimmed) as Learning;
      if (typeof parsed.id === "string" && typeof parsed.target === "string") out.push(parsed);
    } catch { /* skip malformed */ }
  }
  return out;
}

export function pendingFirst(learnings: Learning[]): Learning[] {
  return [...learnings].sort((a, b) => {
    const ap = a.gate === "gated" && a.status === "pending" ? 0 : 1;
    const bp = b.gate === "gated" && b.status === "pending" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return b.at.localeCompare(a.at);
  });
}

export function decide(learning: Learning, decision: "accepted" | "rejected", atISO: string): Learning {
  return { ...learning, status: decision, decidedAt: atISO };
}

export function applyCadenceTuning(
  cadence: Cadence,
  pillarName: string,
  delta: number,
  learningId: string,
  atISO: string
): Cadence {
  const pillars = cadence.pillars.map((p) =>
    p.name === pillarName ? { ...p, weight: Math.max(0, p.weight + delta) } : p
  );
  return {
    ...cadence,
    pillars,
    updatedBy: [
      ...cadence.updatedBy,
      { at: atISO, learningId, summary: `${pillarName} weight ${delta >= 0 ? "+" : ""}${delta}` },
    ],
  };
}
