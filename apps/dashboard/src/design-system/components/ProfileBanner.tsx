import type { CSSProperties } from "react";
import type { DesignTokens } from "../types";

export interface ProfileBannerProps {
  tokens: DesignTokens;
  domain: string;
  headline: string;
  subline: string;
  status?: string;
}

export function ProfileBanner({
  tokens: t,
  domain,
  headline,
  subline,
  status = "Open to senior roles",
}: ProfileBannerProps) {
  const banner: CSSProperties = {
    position: "relative",
    backgroundColor: t.color.ink,
    color: t.color.paper,
    fontFamily: t.font.body,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    paddingTop: t.space.md,
    paddingRight: t.space.lg,
    paddingBottom: t.space.xl,
    paddingLeft: `calc(${t.space.lg} + 4px)`,
    overflow: "hidden",
    borderRadius: t.radius.md,
    minHeight: "180px",
  };

  const accentMargin: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "4px",
    backgroundColor: t.color.accent,
  };

  const topRow: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: t.space.sm,
  };

  const domainStyle: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.68rem",
    letterSpacing: "0.1em",
    textTransform: "lowercase" as const,
    color: t.color.accent,
  };

  const pill: CSSProperties = {
    fontFamily: t.font.mono,
    fontSize: "0.6rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    color: t.color.accentInk,
    backgroundColor: t.color.accent,
    borderRadius: t.radius.pill,
    padding: `${t.space.xs} ${t.space.sm}`,
    whiteSpace: "nowrap" as const,
  };

  const headlineStyle: CSSProperties = {
    fontFamily: t.font.display,
    fontWeight: t.weight.black,
    fontSize: "1.6rem",
    lineHeight: 1.15,
    color: t.color.paper,
    margin: `${t.space.sm} 0 ${t.space.xs}`,
    width: "100%",
  };

  const sublineStyle: CSSProperties = {
    fontFamily: t.font.body,
    fontWeight: t.weight.regular,
    fontSize: "0.9rem",
    color: t.color.slate,
    margin: 0,
  };

  return (
    <div style={banner}>
      <div style={accentMargin} aria-hidden="true" />
      <div style={topRow}>
        <span style={domainStyle}>{domain}</span>
        <span style={pill}>{status}</span>
      </div>
      <h1 style={headlineStyle}>{headline}</h1>
      <p style={sublineStyle}>{subline}</p>
    </div>
  );
}
