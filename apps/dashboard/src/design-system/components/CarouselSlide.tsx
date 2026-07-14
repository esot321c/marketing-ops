import type { CSSProperties } from "react";
import type { DesignTokens } from "../types";

export interface CarouselSlideProps {
  tokens: DesignTokens;
  index: number;
  total: number;
  title: string;
  body?: string;
  bullets?: string[];
  dark?: boolean;
  brand: string;
  url: string;
}

export function CarouselSlide({
  tokens: t,
  index,
  total,
  title,
  body,
  bullets,
  dark = false,
  brand,
  url,
}: CarouselSlideProps) {
  const bg = dark ? t.color.ink : t.color.paper;
  const fg = dark ? t.color.paper : t.color.ink;
  const fgSoft = dark ? t.color.slate : t.color.inkSoft;

  const slide: CSSProperties = {
    width: "360px",
    height: "360px",
    backgroundColor: bg,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: t.space.lg,
    boxSizing: "border-box",
    fontFamily: t.font.body,
    color: fg,
    overflow: "hidden",
  };

  const topRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  };

  const brandStyle: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.68rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: t.color.accent,
  };

  const counterStyle: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.68rem",
    color: fgSoft,
    letterSpacing: "0.06em",
  };

  const accentRule: CSSProperties = {
    width: "2.5rem",
    height: "2px",
    backgroundColor: t.color.accent,
    border: "none",
    margin: `${t.space.sm} 0`,
  };

  const titleStyle: CSSProperties = {
    fontFamily: t.font.display,
    fontWeight: t.weight.black,
    fontSize: "1.4rem",
    lineHeight: 1.2,
    color: fg,
    margin: 0,
    flex: 1,
  };

  const bodyStyle: CSSProperties = {
    fontFamily: t.font.body,
    fontSize: "0.9rem",
    lineHeight: 1.55,
    color: fgSoft,
    margin: `${t.space.sm} 0 0`,
  };

  const listStyle: CSSProperties = {
    fontFamily: t.font.body,
    fontSize: "0.9rem",
    lineHeight: 1.55,
    color: fgSoft,
    margin: `${t.space.sm} 0 0`,
    paddingLeft: "1.1em",
  };

  const urlStyle: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.62rem",
    letterSpacing: "0.08em",
    color: fgSoft,
    textTransform: "lowercase" as const,
  };

  const padIndex = String(index).padStart(2, "0");
  const padTotal = String(total).padStart(2, "0");

  return (
    <div style={slide}>
      <div>
        <div style={topRow}>
          <span style={brandStyle}>{brand}</span>
          <span style={counterStyle}>
            {padIndex} / {padTotal}
          </span>
        </div>
        <hr style={accentRule} />
        <h2 style={titleStyle}>{title}</h2>
        {body !== undefined && body !== "" && <p style={bodyStyle}>{body}</p>}
        {bullets !== undefined && bullets.length > 0 && (
          <ul style={listStyle}>
            {bullets.map((b, i) => (
              <li key={i} style={{ marginTop: i === 0 ? 0 : "0.3em" }}>{b}</li>
            ))}
          </ul>
        )}
      </div>
      <footer>
        <span style={urlStyle}>{url}</span>
      </footer>
    </div>
  );
}
