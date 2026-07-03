import type { AgentAction, RunMode } from "./contentTypes.js";

export interface RunPosture {
  hasOauthToken: boolean;
  hasApiKey: boolean;
  localBackend: boolean;
}

export function detectPosture(env: Record<string, string | undefined>): RunPosture {
  return {
    hasOauthToken: Boolean(env.CLAUDE_CODE_OAUTH_TOKEN),
    hasApiKey: Boolean(env.ANTHROPIC_API_KEY),
    localBackend:
      Boolean(env.ANTHROPIC_BASE_URL) ||
      env.CLAUDE_CODE_USE_BEDROCK === "1" ||
      env.CLAUDE_CODE_USE_VERTEX === "1",
  };
}

export function availableModes(posture: RunPosture): RunMode[] {
  const modes: RunMode[] = ["chat"];
  if (posture.hasOauthToken || posture.localBackend) modes.push("headless-subscription");
  if (posture.hasApiKey && !posture.localBackend) modes.push("headless-apikey");
  return modes;
}

export function recommendedMode(action: AgentAction, posture: RunPosture): RunMode {
  const modes = availableModes(posture);
  if (action === "refine") return "chat";
  if (modes.includes("headless-subscription")) return "headless-subscription";
  return "chat";
}

export function buildHeadlessRun(
  instruction: string,
  mode: RunMode,
  env: Record<string, string | undefined>
): { argv: string[]; env: Record<string, string | undefined> } {
  const argv = ["-p", instruction]; // never --bare
  if (mode === "headless-subscription") {
    const child = { ...env };
    delete child.ANTHROPIC_API_KEY; // force the OAuth token / local backend
    return { argv, env: child };
  }
  return { argv, env: { ...env } };
}
