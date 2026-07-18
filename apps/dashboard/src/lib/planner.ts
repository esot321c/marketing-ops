import type { Cadence, ContentItem } from "./contentTypes.js";
import { PARKED_STATES } from "./contentLibrary.js";

export interface Suggestion { channel: string; format: string; pillar: string; }

function isoWeekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday=0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

const isParked = (i: ContentItem): boolean => (PARKED_STATES as string[]).includes(i.state);

export function dueItems(items: ContentItem[], todayISO: string): ContentItem[] {
  return items.filter(
    (i) =>
      !isParked(i) &&
      i.schedule.status === "scheduled" &&
      typeof i.schedule.date === "string" &&
      i.schedule.date <= todayISO
  );
}

export function suggestedGaps(
  items: ContentItem[],
  cadence: Cadence,
  todayISO: string
): Suggestion[] {
  const week = isoWeekKey(todayISO);
  const madeThisWeek = new Map<string, number>();
  const usedPillars = new Set<string>();
  for (const i of items) {
    if (isParked(i)) continue;
    const d = i.schedule.date;
    if (typeof d === "string" && isoWeekKey(d) === week) {
      const key = `${i.channel}/${i.format}`;
      madeThisWeek.set(key, (madeThisWeek.get(key) ?? 0) + 1);
      usedPillars.add(i.pillar);
    }
  }
  const byWeight = [...cadence.pillars].sort((a, b) => b.weight - a.weight);
  const chosen = new Set<string>(usedPillars);
  function nextPillar(): string {
    const unused = byWeight.find((p) => !chosen.has(p.name));
    if (unused) { chosen.add(unused.name); return unused.name; }
    // all pillars used this week: cycle back to the highest weight
    chosen.clear();
    const top = byWeight[0];
    if (top) { chosen.add(top.name); return top.name; }
    return "general";
  }
  const out: Suggestion[] = [];
  for (const [key, target] of Object.entries(cadence.perWeek)) {
    const shortfall = target - (madeThisWeek.get(key) ?? 0);
    const [channel, format] = key.split("/");
    for (let n = 0; n < shortfall; n++) {
      out.push({ channel: channel ?? "", format: format ?? "", pillar: nextPillar() });
    }
  }
  return out;
}

export function todayView(
  items: ContentItem[],
  cadence: Cadence,
  todayISO: string
): { due: ContentItem[]; suggested: Suggestion[] } {
  return { due: dueItems(items, todayISO), suggested: suggestedGaps(items, cadence, todayISO) };
}
