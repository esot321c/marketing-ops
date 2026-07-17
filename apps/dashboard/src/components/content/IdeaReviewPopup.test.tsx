// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IdeaReviewPopup } from "./IdeaReviewPopup.js";
import type { ContentItem } from "@/lib/contentTypes";

const item: ContentItem = {
  id: "item-1",
  tenantId: "example-agency",
  channel: "linkedin",
  format: "text-post",
  state: "idea",
  title: "Example title",
  angle: "This is the whole pitch for the piece. It runs several sentences long and explains the angle in detail.",
  pillar: "reliability",
  assets: [],
  schedule: { status: "unscheduled" },
  source: ["verified-source-a", "verified-source-b"],
  refineLog: [],
};

test("renders title, full angle, pillar and format pills, and source entries", () => {
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={() => undefined}
      onClose={() => undefined}
    />
  );

  expect(screen.getByText(item.title)).toBeTruthy();
  expect(screen.getByText(item.angle)).toBeTruthy();
  expect(screen.getByText(item.pillar)).toBeTruthy();
  expect(screen.getByText("text-post")).toBeTruthy();
  expect(screen.getByText("verified-source-a")).toBeTruthy();
  expect(screen.getByText("verified-source-b")).toBeTruthy();
});

test("Move to drafting calls onMoveToDrafting", () => {
  const onMoveToDrafting = vi.fn();
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={onMoveToDrafting}
      onOpenComposer={() => undefined}
      onClose={() => undefined}
    />
  );

  fireEvent.click(screen.getByText("Move to drafting"));
  expect(onMoveToDrafting).toHaveBeenCalledWith(item.id);
});

test("Open in Composer calls onOpenComposer", () => {
  const onOpenComposer = vi.fn();
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={onOpenComposer}
      onClose={() => undefined}
    />
  );

  fireEvent.click(screen.getByText("Open in Composer"));
  expect(onOpenComposer).toHaveBeenCalledWith(item.id);
});

test("X button calls onClose", () => {
  const onClose = vi.fn();
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={() => undefined}
      onClose={onClose}
    />
  );

  fireEvent.click(screen.getByLabelText("Close"));
  expect(onClose).toHaveBeenCalled();
});

test("Escape key calls onClose", () => {
  const onClose = vi.fn();
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={() => undefined}
      onClose={onClose}
    />
  );

  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});

test("backdrop click calls onClose", () => {
  const onClose = vi.fn();
  const { container } = render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={() => undefined}
      onClose={onClose}
    />
  );

  const backdrop = container.querySelector("[data-testid='idea-review-backdrop']");
  expect(backdrop).toBeTruthy();
  fireEvent.click(backdrop as Element);
  expect(onClose).toHaveBeenCalled();
});

test("clicking inside the card does not call onClose", () => {
  const onClose = vi.fn();
  render(
    <IdeaReviewPopup
      item={item}
      onMoveToDrafting={() => undefined}
      onOpenComposer={() => undefined}
      onClose={onClose}
    />
  );

  fireEvent.click(screen.getByText(item.title));
  expect(onClose).not.toHaveBeenCalled();
});
