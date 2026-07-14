// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaptionCard } from "./CaptionCard.js";

test("CaptionCard shows the caption text when present", () => {
  render(<CaptionCard caption="Here is the post body" />);
  expect(screen.getByText("Here is the post body")).toBeTruthy();
});

test("CaptionCard shows an empty state when there is no caption", () => {
  render(<CaptionCard caption={undefined} />);
  expect(screen.getByText("No caption yet.")).toBeTruthy();
});
