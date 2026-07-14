import { test, expect } from "vitest";
import { slideFileName, slideImageFor, allSlideImages } from "./slideAssets.js";

test("slideFileName pads the slide number and maps the MIME type", () => {
  expect(slideFileName(1, "image/png")).toBe("slide-01.png");
  expect(slideFileName(3, "image/jpeg")).toBe("slide-03.jpg");
  expect(slideFileName(12, "image/webp")).toBe("slide-12.webp");
  expect(slideFileName(2, "application/octet-stream")).toBe("slide-02.png");
});

test("slideImageFor finds the image for a 1-based slide number", () => {
  const files = ["slide-01.png", "slide-03.webp", "notes.pdf"];
  expect(slideImageFor(files, 1)).toBe("slide-01.png");
  expect(slideImageFor(files, 3)).toBe("slide-03.webp");
  expect(slideImageFor(files, 2)).toBeUndefined();
});

test("allSlideImages requires every slide up to count", () => {
  expect(allSlideImages(["slide-01.png", "slide-02.jpg"], 2)).toBe(true);
  expect(allSlideImages(["slide-01.png"], 2)).toBe(false);
  expect(allSlideImages([], 0)).toBe(false);
});
