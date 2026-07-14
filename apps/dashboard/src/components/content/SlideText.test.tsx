// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SlideText, slidesToText } from "./SlideText.js";

test("slidesToText numbers slides and includes headings and bodies", () => {
  const out = slidesToText([
    { heading: "First", body: "One" },
    { heading: "Second" },
  ]);
  expect(out).toBe("01  First\nOne\n\n02  Second");
});

test("SlideText renders the assembled slide script", () => {
  render(<SlideText slides={[{ heading: "First", body: "One" }]} />);
  expect(screen.getByText((content) => /01\s+First/.test(content))).toBeTruthy();
});

test("slidesToText renders bullets as point-form lines", () => {
  const out = slidesToText([
    { heading: "First", body: "Lead-in.", bullets: ["Alpha", "Beta"] },
  ]);
  expect(out).toBe("01  First\nLead-in.\n- Alpha\n- Beta");
});
