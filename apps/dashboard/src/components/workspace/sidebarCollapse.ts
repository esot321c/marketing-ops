export const SIDEBAR_COLLAPSED_KEY = "ws-sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    // ignore write failures (e.g. storage disabled or full)
  }
}

// Per-section fold state. Sections the user rarely opens (Work, Tune, Setup)
// start folded so the sidebar leads with day-to-day navigation; the choice is
// remembered per section. A missing value falls back to `fallback` (the
// section's default fold), so we do not have to seed storage.
const SIDEBAR_GROUP_KEY = "ws-sidebar-group";

export function readGroupFolded(group: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(`${SIDEBAR_GROUP_KEY}:${group}`);
    return v === null ? fallback : v === "true";
  } catch {
    return fallback;
  }
}

export function writeGroupFolded(group: string, folded: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${SIDEBAR_GROUP_KEY}:${group}`, folded ? "true" : "false");
  } catch {
    // ignore write failures (e.g. storage disabled or full)
  }
}
