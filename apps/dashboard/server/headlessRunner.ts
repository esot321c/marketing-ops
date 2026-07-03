import { buildHeadlessRun } from "../src/lib/runModes.js";
import type { AgentAction, RunMode } from "../src/lib/contentTypes.js";

export interface RunRecord {
  at: string;
  action: AgentAction;
  mode: RunMode;
  credentialKind: "subscription" | "apikey";
  exitCode: number;
}

type SpawnFn = (
  command: string,
  argv: string[],
  opts: { env: Record<string, string | undefined> }
) => { on: (event: string, cb: (code: number) => void) => void };

export interface RunDeps {
  spawn: SpawnFn;
  appendRun: (tenant: string, record: RunRecord) => Promise<void>;
  env: Record<string, string | undefined>;
  now: () => string;
}

export interface RunOpts {
  tenant: string;
  action: AgentAction;
  instruction: string;
  mode: Exclude<RunMode, "chat">;
}

export function runHeadless(opts: RunOpts, deps: RunDeps): Promise<{ exitCode: number; runId: string }> {
  const { argv, env } = buildHeadlessRun(opts.instruction, opts.mode, deps.env);
  const credentialKind = opts.mode === "headless-apikey" ? "apikey" : "subscription";
  const at = deps.now();
  return new Promise((resolve) => {
    const child = deps.spawn("claude", argv, { env });
    child.on("close", (code: number) => {
      void deps
        .appendRun(opts.tenant, { at, action: opts.action, mode: opts.mode, credentialKind, exitCode: code })
        .catch((err) => { console.error("headlessRunner: appendRun failed", err); })
        .finally(() => resolve({ exitCode: code, runId: at }));
    });
  });
}
