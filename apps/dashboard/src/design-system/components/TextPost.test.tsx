import { test, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TextPost } from "./TextPost";
import type { DesignTokens } from "../types";

const tokens: DesignTokens = {
  color: {
    ink: "#111111",
    inkSoft: "#444444",
    paper: "#ffffff",
    paperRaised: "#f8f8f8",
    band: "#f0f0f0",
    accent: "#00bfae",
    accentInk: "#ffffff",
    slate: "#888888",
    line: "#e0e0e0",
    positive: "#22c55e",
  },
  font: {
    display: "Georgia, serif",
    body: "Inter, sans-serif",
    mono: "'Fira Mono', monospace",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    black: 900,
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
    xxl: "64px",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    pill: "9999px",
  },
  shadow: {
    card: "0 2px 8px rgba(0,0,0,0.08)",
  },
};

test("TextPost renders the headline and body", () => {
  const html = renderToStaticMarkup(
    <TextPost tokens={tokens} headline="Authority wins" body="Ship in public." />,
  );
  expect(html).toContain("Authority wins");
  expect(html).toContain("Ship in public.");
});

test("TextPost renders optional kicker when provided", () => {
  const html = renderToStaticMarkup(
    <TextPost
      tokens={tokens}
      kicker="Weekly insight"
      headline="Authority wins"
      body="Ship in public."
    />,
  );
  expect(html).toContain("Weekly insight");
});

test("TextPost omits kicker section when not provided", () => {
  const html = renderToStaticMarkup(
    <TextPost tokens={tokens} headline="Authority wins" body="Ship in public." />,
  );
  expect(html).not.toContain("Weekly insight");
});

test("TextPost renders optional closer when provided", () => {
  const html = renderToStaticMarkup(
    <TextPost
      tokens={tokens}
      headline="Authority wins"
      body="Ship in public."
      closer="Stay consistent."
    />,
  );
  expect(html).toContain("Stay consistent.");
});
