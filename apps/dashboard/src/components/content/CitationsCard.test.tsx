// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CitationsCard } from "./CitationsCard.js";

test("CitationsCard renders each citation as a link to its url", () => {
  render(<CitationsCard citations={[{ label: "A study", url: "https://example.com/study" }]} />);
  const link = screen.getByText("A study");
  expect(link.getAttribute("href")).toBe("https://example.com/study");
});

test("CitationsCard shows an empty state when there are no citations", () => {
  render(<CitationsCard citations={[]} />);
  expect(screen.getByText("No sources cited.")).toBeTruthy();
});
