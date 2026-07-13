import { useEffect, useState } from "react";
import { getRunModes, postRun } from "@/lib/api";
import type { AgentAction, RunMode } from "@/lib/contentTypes";
import { recommendedMode } from "@/lib/runModes";
import { CopyPrompt } from "./CopyPrompt";
import { RunModeInfo, type Posture } from "./RunModeInfo";

const LABEL: Record<RunMode, string> = {
  "chat": "Chat (copy-paste)",
  "headless-subscription": "Headless, subscription",
  "headless-apikey": "Headless, API key",
};

export function RunModeSelect({ tenant, action, targetId, beforeRun }: { tenant: string; action: AgentAction; targetId?: string; beforeRun?: () => Promise<void> }) {
  const [modes, setModes] = useState<RunMode[]>(["chat"]);
  const [posture, setPosture] = useState<Posture>({ hasOauthToken: false, hasApiKey: false, localBackend: false });
  const [mode, setMode] = useState<RunMode>("chat");
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void getRunModes(tenant)
      .then((r) => {
        setModes(r.modes);
        setPosture(r.posture);
        setMode(recommendedMode(action, r.posture));
      })
      .catch(() => {});
  }, [tenant, action]);

  async function go() {
    setRunning(true);
    try {
      if (beforeRun) await beforeRun();
      const res = await postRun(tenant, action, mode, targetId);
      setChatPrompt(res.mode === "chat" ? res.instruction ?? null : null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select
          className="ws-input"
          style={{ width: "auto", minWidth: 210, cursor: "pointer" }}
          value={mode}
          onChange={(e) => setMode(e.target.value as RunMode)}
        >
          {modes.map((m) => (
            <option key={m} value={m}>{LABEL[m]}</option>
          ))}
        </select>
        <button type="button" className="ws-btn ws-btn-primary" onClick={go} disabled={running}>
          {running ? "Running…" : "Run"}
        </button>
        <RunModeInfo posture={posture} />
      </div>
      {chatPrompt ? <CopyPrompt prompt={chatPrompt} /> : null}
    </div>
  );
}
