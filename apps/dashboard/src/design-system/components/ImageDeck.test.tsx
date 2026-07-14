// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageDeck } from "./ImageDeck.js";
import type { DesignTokens } from "../types";

const tokens = { color: { ink: "#000", inkSoft: "#333", paper: "#fff", paperRaised: "#fff", band: "#eee", accent: "#0d9488", accentInk: "#0f766e", slate: "#777", line: "#ddd", positive: "#2f7d5b" }, font: { display: "serif", body: "sans", mono: "mono" }, weight: { regular: 400, medium: 500, semibold: 600, black: 800 }, space: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "40px", xxl: "64px" }, radius: { sm: "6px", md: "12px", lg: "20px", pill: "999px" }, shadow: { card: "none" } } as DesignTokens;

test("ImageDeck shows the current image and navigates by dot", () => {
  render(<ImageDeck tokens={tokens} images={[
    { src: "/a.png", alt: "Slide one" },
    { src: "/b.png", alt: "Slide two" },
  ]} />);
  expect(screen.getByAltText("Slide one")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("slide 2"));
  expect(screen.getByAltText("Slide two")).toBeTruthy();
});

test("ImageDeck renders nothing for an empty list", () => {
  const { container } = render(<ImageDeck tokens={tokens} images={[]} />);
  expect(container.firstChild).toBeNull();
});
