import { test, expect } from "vitest";
import { detectPosture, availableModes, recommendedMode, buildHeadlessRun } from "./runModes.js";

test("detectPosture reads tokens and a local base-url override", () => {
  expect(detectPosture({ CLAUDE_CODE_OAUTH_TOKEN: "t" })).toEqual({ hasOauthToken: true, hasApiKey: false, localBackend: false });
  expect(detectPosture({ ANTHROPIC_API_KEY: "k" }).hasApiKey).toBe(true);
  expect(detectPosture({ ANTHROPIC_BASE_URL: "http://localhost:11434" }).localBackend).toBe(true);
  expect(detectPosture({ CLAUDE_CODE_USE_BEDROCK: "1" }).localBackend).toBe(true);
});

test("chat is always available and listed first", () => {
  expect(availableModes({ hasOauthToken: false, hasApiKey: false, localBackend: false })).toEqual(["chat"]);
  expect(availableModes({ hasOauthToken: true, hasApiKey: false, localBackend: false }))
    .toEqual(["chat", "headless-subscription"]);
  expect(availableModes({ hasOauthToken: false, hasApiKey: true, localBackend: false }))
    .toEqual(["chat", "headless-apikey"]);
});

test("recommendedMode: refine prefers chat; one-shot prefers headless when available", () => {
  const sub = { hasOauthToken: true, hasApiKey: false, localBackend: false };
  expect(recommendedMode("refine", sub)).toBe("chat");
  expect(recommendedMode("fulfil-request", sub)).toBe("headless-subscription");
  expect(recommendedMode("fulfil-request", { hasOauthToken: false, hasApiKey: false, localBackend: false })).toBe("chat");
});

test("buildHeadlessRun never uses --bare; subscription strips the API key; apikey keeps it", () => {
  const sub = buildHeadlessRun("do it", "headless-subscription", { ANTHROPIC_API_KEY: "k", CLAUDE_CODE_OAUTH_TOKEN: "t" });
  expect(sub.argv).toEqual(["-p", "do it"]);
  expect(sub.argv).not.toContain("--bare");
  expect(sub.env.ANTHROPIC_API_KEY).toBeUndefined();
  expect(sub.env.CLAUDE_CODE_OAUTH_TOKEN).toBe("t");

  const key = buildHeadlessRun("do it", "headless-apikey", { ANTHROPIC_API_KEY: "k" });
  expect(key.env.ANTHROPIC_API_KEY).toBe("k");
});
