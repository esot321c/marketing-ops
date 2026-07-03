export interface DesignTokens {
  color: {
    ink: string;
    inkSoft: string;
    paper: string;
    paperRaised: string;
    band: string;
    accent: string;
    accentInk: string;
    slate: string;
    line: string;
    positive: string;
  };
  font: { display: string; body: string; mono: string };
  weight: { regular: number; medium: number; semibold: number; black: number };
  space: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string };
  radius: { sm: string; md: string; lg: string; pill: string };
  shadow: { card: string };
}
