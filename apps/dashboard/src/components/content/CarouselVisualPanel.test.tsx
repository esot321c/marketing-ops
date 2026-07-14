// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarouselVisualPanelView } from "./CarouselVisualPanel.js";
import type { Asset } from "@/lib/contentTypes";
import type { DesignTokens } from "@/design-system/types";

const tokens = { color: { ink: "#000", inkSoft: "#333", paper: "#fff", paperRaised: "#fff", band: "#eee", accent: "#0d9488", accentInk: "#0f766e", slate: "#777", line: "#ddd", positive: "#2f7d5b" }, font: { display: "serif", body: "sans", mono: "mono" }, weight: { regular: 400, medium: 500, semibold: 600, black: 800 }, space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px", xxl: "64px" }, radius: { sm: "6px", md: "12px", lg: "20px", pill: "999px" }, shadow: { card: "none" } } as DesignTokens;

const asset: Asset = {
  id: "visual", kind: "carousel-visual", route: "external-tool", tool: "nano-banana", status: "needed",
  package: { kind: "image", prompt: "Deck style.", treatment: "infographic",
    slidePrompts: [{ slide: 1, prompt: "Slide one prompt." }, { slide: 2, prompt: "Slide two prompt." }] },
};
const slides = [{ heading: "Hook" }, { heading: "Point" }];
const noop = () => undefined;
const urlFor = (f: string) => `/img/${f}`;

test("renders a prompt and an upload control per slide, image when present", () => {
  render(<CarouselVisualPanelView asset={asset} slides={slides} files={["slide-01.png"]}
    tokens={tokens} urlFor={urlFor} onUpload={noop} />);
  expect(screen.getByText("Slide one prompt.")).toBeTruthy();
  expect(screen.getByText("Slide two prompt.")).toBeTruthy();
  expect(screen.getByAltText("Slide 1 image")).toBeTruthy();
  expect(screen.getAllByText("Add image").length).toBe(1);
});

test("promotes the image deck when every slide has an image", () => {
  render(<CarouselVisualPanelView asset={asset} slides={slides} files={["slide-01.png", "slide-02.png"]}
    tokens={tokens} urlFor={urlFor} onUpload={noop} />);
  expect(screen.getByAltText("Hook")).toBeTruthy();
});

test("says when a slide has no prompt yet", () => {
  const bare: Asset = { ...asset, package: { kind: "image", prompt: "Deck style.", slidePrompts: [] } };
  render(<CarouselVisualPanelView asset={bare} slides={slides} files={[]}
    tokens={tokens} urlFor={urlFor} onUpload={noop} />);
  expect(screen.getAllByText("No prompt yet.").length).toBe(2);
});
