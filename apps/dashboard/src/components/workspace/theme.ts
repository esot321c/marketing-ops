import type { CSSProperties } from "react";
import type { DesignTokens } from "@/design-system/types";

export const FALLBACK: DesignTokens = {
  color: {
    ink: "#1c1917", inkSoft: "#57534e", paper: "#faf9f6", paperRaised: "#ffffff",
    band: "#efece6", accent: "#0d9488", accentInk: "#0f766e", slate: "#78716c",
    line: "#e7e5e4", positive: "#2f7d5b",
  },
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
  weight: { regular: 400, medium: 500, semibold: 600, black: 800 },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px", xxl: "64px" },
  radius: { sm: "6px", md: "12px", lg: "20px", pill: "999px" },
  shadow: { card: "0 1px 2px rgba(28,25,23,0.05), 0 10px 30px rgba(28,25,23,0.07)" },
};

export function wsStyle(t: DesignTokens): CSSProperties {
  const vars: Record<string, string> = {
    "--ws-paper": t.color.paper, "--ws-raised": t.color.paperRaised, "--ws-ink": t.color.ink,
    "--ws-ink-soft": t.color.inkSoft, "--ws-slate": t.color.slate, "--ws-band": t.color.band,
    "--ws-accent": t.color.accent, "--ws-accent-ink": t.color.accentInk, "--ws-line": t.color.line,
    "--ws-shadow": t.shadow.card, "--ws-display": t.font.display, "--ws-body": t.font.body,
    "--ws-mono": t.font.mono,
  };
  return vars as CSSProperties;
}

// The app's single neutral surface, shared by every tenant in Base mode. Not a
// "dark mode" — Brand can also be dark; this is just the app's own look.
export const BASE_TOKENS: DesignTokens = {
  color: {
    ink: "#e7e5e4", inkSoft: "#a8a29e", paper: "#111014", paperRaised: "#1a191e",
    band: "#232228", accent: "#14b8a6", accentInk: "#5eead4", slate: "#8b8792",
    line: "#2b2930", positive: "#4ade80",
  },
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },
  weight: { regular: 400, medium: 500, semibold: 600, black: 800 },
  space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px", xxl: "64px" },
  radius: { sm: "6px", md: "12px", lg: "20px", pill: "999px" },
  shadow: { card: "0 1px 2px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.5)" },
};
