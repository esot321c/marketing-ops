import type { CSSProperties } from "react";
import type { DesignTokens } from "../types";

export interface TextPostProps {
  tokens: DesignTokens;
  kicker?: string;
  headline: string;
  body: string;
  closer?: string;
}

export function TextPost({ tokens: t, kicker, headline, body, closer }: TextPostProps) {
  const card: CSSProperties = {
    backgroundColor: t.color.paperRaised,
    borderRadius: t.radius.lg,
    boxShadow: t.shadow.card,
    padding: t.space.lg,
    fontFamily: t.font.body,
    color: t.color.ink,
    display: "flex",
    flexDirection: "column",
    gap: t.space.md,
  };

  const kickerWrap: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
  };

  const kickerText: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: t.color.accent,
    margin: 0,
  };

  const accentRule: CSSProperties = {
    width: "2rem",
    height: "2px",
    backgroundColor: t.color.accent,
    border: "none",
    margin: 0,
  };

  const headlineStyle: CSSProperties = {
    fontFamily: t.font.display,
    fontWeight: t.weight.black,
    fontSize: "1.5rem",
    lineHeight: 1.2,
    color: t.color.ink,
    margin: 0,
  };

  const bodyStyle: CSSProperties = {
    fontFamily: t.font.body,
    fontWeight: t.weight.regular,
    fontSize: "1rem",
    lineHeight: 1.6,
    color: t.color.inkSoft,
    margin: 0,
    whiteSpace: "pre-line",
  };

  const closerStyle: CSSProperties = {
    fontFamily: t.font.display,
    fontStyle: "italic",
    fontWeight: t.weight.medium,
    fontSize: "0.95rem",
    color: t.color.slate,
    borderTop: `1px solid ${t.color.line}`,
    paddingTop: t.space.sm,
    margin: 0,
  };

  return (
    <article style={card}>
      {kicker !== undefined && kicker !== "" && (
        <div style={kickerWrap}>
          <p style={kickerText}>{kicker}</p>
          <hr style={accentRule} />
        </div>
      )}
      <h2 style={headlineStyle}>{headline}</h2>
      <p style={bodyStyle}>{body}</p>
      {closer !== undefined && closer !== "" && (
        <p style={closerStyle}>{closer}</p>
      )}
    </article>
  );
}
