import { useCallback, useState } from "react";
import { getLearnings, postLearningDecision } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import type { Learning } from "@/lib/contentTypes";
import { CopyPrompt } from "./CopyPrompt";

export function LearningsPanel({ tenant }: { tenant: string }) {
  const fetch = useCallback(() => getLearnings(tenant), [tenant]);
  const { data, reload } = useLiveData<{ learnings: Learning[] }>(
    fetch,
    (p) => p.includes(`/content/${tenant}/learnings`)
  );
  const [applyPrompt, setApplyPrompt] = useState<string | null>(null);

  async function decide(id: string, decision: "accepted" | "rejected") {
    const res = await postLearningDecision(tenant, id, decision);
    setApplyPrompt(res.instruction);
    reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 className="ws-h1">Learnings</h1>
        <p className="ws-sub">What the motion learned, feeding back into the brand. Identity edits wait for you.</p>
      </header>

      {!data ? (
        <p className="ws-slate" style={{ fontSize: 13 }}>Loading…</p>
      ) : data.learnings.length === 0 ? (
        <p className="ws-slate" style={{ fontSize: 13 }}>No learnings yet — they accrue as content gets posted and refined.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.learnings.map((l) => (
            <div key={l.id} className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="ws-pill ws-pill-accent ws-pill-mono">{l.target}</span>
                <span className="ws-pill ws-pill-mono">{l.status}</span>
                <span className="ws-slate" style={{ fontSize: 11 }}>{l.source}</span>
              </div>
              <p className="ws-ink" style={{ fontSize: 14, margin: 0 }}>{l.observation}</p>
              <pre className="ws-pre" style={{ margin: 0 }}>{l.proposedChange}</pre>
              {l.gate === "gated" && l.status === "pending" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="ws-btn ws-btn-primary ws-btn-sm" onClick={() => decide(l.id, "accepted")}>
                    Accept
                  </button>
                  <button type="button" className="ws-btn ws-btn-sm" onClick={() => decide(l.id, "rejected")}>
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {applyPrompt ? <CopyPrompt prompt={applyPrompt} /> : null}
    </div>
  );
}
