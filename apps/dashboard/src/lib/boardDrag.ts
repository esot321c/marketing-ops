import type { ContentState } from "./contentTypes";

export function dropArgs(
  source: ContentState,
  target: ContentState,
  today: string,
): { to: ContentState; date?: string } | null {
  if (source === target) return null;
  return target === "scheduled" ? { to: target, date: today } : { to: target };
}
