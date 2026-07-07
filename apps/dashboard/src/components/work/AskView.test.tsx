// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AskView } from "./AskView.js";

test("renders all five capability labels and campaigns prompt", () => {
  render(<AskView tenantName="Example Agency" />);

  expect(screen.getByText("Campaigns")).toBeTruthy();
  expect(screen.getByText("Strategy")).toBeTruthy();
  expect(screen.getByText("SEO / Keywords")).toBeTruthy();
  expect(screen.getByText("Research")).toBeTruthy();
  expect(screen.getByText("Analytics")).toBeTruthy();

  expect(screen.getByText("Plan a campaign for Example Agency")).toBeTruthy();
  expect(screen.getByText(/Find the search terms and topics worth targeting/)).toBeTruthy();
});
