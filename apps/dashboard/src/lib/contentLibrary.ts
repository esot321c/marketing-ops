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

// Fixed, on-brand palette for board column accents. A valid color value is a
// key of this map (never free hex), so saved prefs stay validatable.
export const COLUMN_COLORS: Record<string, string> = {
  default: "var(--muted-foreground)",
  slate: "var(--color-slate-500)",
  red: "var(--color-red-500)",
  amber: "var(--color-amber-500)",
  green: "var(--color-green-500)",
  blue: "var(--color-blue-500)",
  purple: "var(--color-purple-500)",
  teal: "var(--color-teal-500)",
};

export interface BoardPrefs {
  columnOrder: ContentState[];
  columnColors?: Partial<Record<ContentState, string>>;
}

const BOARD_STATE_SET: ReadonlySet<string> = new Set(ALL_BOARD_STATES);

function isContentState(value: unknown): value is ContentState {
  return typeof value === "string" && BOARD_STATE_SET.has(value);
}

// Cleans a saved (possibly partial/invalid) board-prefs payload: drops
// unknown column-order entries, dedupes, appends any ContentState missing
// from the saved order (in ALL_BOARD_STATES order) so every column always
// renders exactly once, and strips columnColors entries whose state is not a
// ContentState or whose color is not a COLUMN_COLORS key.
export function reconcileBoardPrefs(prefs: {
  columnOrder: unknown[];
  columnColors?: Record<string, unknown>;
}): BoardPrefs {
  const seen = new Set<ContentState>();
  const columnOrder: ContentState[] = [];
  for (const entry of prefs.columnOrder) {
    if (!isContentState(entry) || seen.has(entry)) continue;
    seen.add(entry);
    columnOrder.push(entry);
  }
  for (const state of ALL_BOARD_STATES) {
    if (!seen.has(state)) columnOrder.push(state);
  }

  const columnColors: Partial<Record<ContentState, string>> = {};
  for (const [state, color] of Object.entries(prefs.columnColors ?? {})) {
    if (!isContentState(state)) continue;
    if (typeof color !== "string" || !(color in COLUMN_COLORS)) continue;
    columnColors[state] = color;
  }

  return { columnOrder, columnColors };
}
