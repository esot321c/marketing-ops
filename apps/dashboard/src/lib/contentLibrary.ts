import type { ContentItem, ContentState } from "./contentTypes.js";
import { validateContentItem } from "./contentTypes.js";

export const BOARD_STATES: ContentState[] = [
  "idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured",
];

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

export function boardIndex(items: ContentItem[]): Record<ContentState, ContentItem[]> {
  const index = Object.fromEntries(
    BOARD_STATES.map((s) => [s, [] as ContentItem[]])
  ) as Record<ContentState, ContentItem[]>;
  for (const item of items) index[item.state].push(item);
  return index;
}
