import { test, expect } from "vitest";
import { readThemeMode, nextThemeMode, THEME_STORAGE_KEY } from "./themeMode.js";

test("readThemeMode defaults to brand for null/unknown, base only for 'base'", () => {
  expect(readThemeMode(null)).toBe("brand");
  expect(readThemeMode("garbage")).toBe("brand");
  expect(readThemeMode("brand")).toBe("brand");
  expect(readThemeMode("base")).toBe("base");
});

test("nextThemeMode flips between brand and base", () => {
  expect(nextThemeMode("brand")).toBe("base");
  expect(nextThemeMode("base")).toBe("brand");
});

test("storage key is stable", () => {
  expect(THEME_STORAGE_KEY).toBe("ws-theme-mode");
});
