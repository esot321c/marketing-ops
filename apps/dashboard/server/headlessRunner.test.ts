import { test, expect, vi } from "vitest";
import { runHeadless } from "./headlessRunner.js";

test("runHeadless spawns claude with the built argv and logs the run", async () => {
  const spawn = vi.fn((_cmd: string, _argv: string[], _opts: unknown) => ({
    on: (event: string, cb: (code: number) => void) => { if (event === "close") cb(0); },
  }));
  const appendRun = vi.fn(async () => {});
  const res = await runHeadless(
    { tenant: "example-personal", action: "fulfil-request", instruction: "do it", mode: "headless-subscription" },
    { spawn: spawn as never, appendRun, env: { CLAUDE_CODE_OAUTH_TOKEN: "t", ANTHROPIC_API_KEY: "k" }, now: () => "2026-07-02T00:00:00Z" }
  );
  expect(res.exitCode).toBe(0);
  expect(spawn).toHaveBeenCalledWith("claude", ["-p", "do it"], expect.objectContaining({ env: expect.not.objectContaining({ ANTHROPIC_API_KEY: "k" }) }));
  expect(appendRun).toHaveBeenCalledWith("example-personal", expect.objectContaining({ action: "fulfil-request", mode: "headless-subscription", credentialKind: "subscription", exitCode: 0 }));
});

test("runHeadless apikey mode keeps the key and records credentialKind apikey", async () => {
  const spawn = vi.fn((_cmd: string, _argv: string[], _opts: unknown) => ({
    on: (event: string, cb: (code: number) => void) => { if (event === "close") cb(0); },
  }));
  const appendRun = vi.fn(async () => {});
  const res = await runHeadless(
    { tenant: "example-personal", action: "fulfil-request", instruction: "do it", mode: "headless-apikey" },
    { spawn: spawn as never, appendRun, env: { ANTHROPIC_API_KEY: "k" }, now: () => "2026-07-02T00:00:00Z" }
  );
  expect(res.runId).toBe("2026-07-02T00:00:00Z");
  expect(spawn).toHaveBeenCalledWith("claude", ["-p", "do it"], expect.objectContaining({ env: expect.objectContaining({ ANTHROPIC_API_KEY: "k" }) }));
  expect(appendRun).toHaveBeenCalledWith("example-personal", expect.objectContaining({ credentialKind: "apikey", exitCode: 0 }));
});

test("runHeadless propagates a non-zero exit code", async () => {
  const spawn = vi.fn((_cmd: string, _argv: string[], _opts: unknown) => ({
    on: (event: string, cb: (code: number) => void) => { if (event === "close") cb(1); },
  }));
  const appendRun = vi.fn(async () => {});
  const res = await runHeadless(
    { tenant: "example-personal", action: "refine", instruction: "x", mode: "headless-subscription" },
    { spawn: spawn as never, appendRun, env: {}, now: () => "2026-07-02T00:00:00Z" }
  );
  expect(res.exitCode).toBe(1);
  expect(appendRun).toHaveBeenCalledWith("example-personal", expect.objectContaining({ exitCode: 1 }));
});
