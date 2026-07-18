import type { ContentItem, ContentState } from "./contentTypes.js";
import { validateContentItem } from "./contentTypes.js";

export const BOARD_STATES: ContentState[] = [
  "idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured",
];

export const PARKED_STATES: ContentState[] = ["needs_work", "parked"];

export const ALL_BOARD_STATES: ContentState[] = [...BOARD_STATES, ...PARKED_STATES];

export function parseItems(rawFiles: string[]): ContentItem[] {
  const out: ContentItem[] = [];
  for (const raw of rawFiles) {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { continue; }
    if (validateContentItem(parsed)) out.push(parsed);
  }
  return out;
}

export function filterByState(items: ContentItem[], state: ContentState): ContentItem[] {
  return items.filter((i) => i.state === state);
}

export function orderedColumn(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    const aOrdered = typeof a.order === "number";
    const bOrdered = typeof b.order === "number";
    if (aOrdered && bOrdered) {
      if (a.order !== b.order) return a.order! - b.order!;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    if (aOrdered !== bOrdered) return aOrdered ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function boardIndex(items: ContentItem[]): Record<ContentState, ContentItem[]> {
  const index = Object.fromEntries(
    ALL_BOARD_STATES.map((s) => [s, [] as ContentItem[]])
  ) as Record<ContentState, ContentItem[]>;
  for (const item of items) index[item.state].push(item);
  for (const s of ALL_BOARD_STATES) index[s] = orderedColumn(index[s]);
  return index;
}

export function activeCount(index: Record<ContentState, ContentItem[]>): number {
  return BOARD_STATES.reduce((sum, s) => sum + index[s].length, 0);
}
