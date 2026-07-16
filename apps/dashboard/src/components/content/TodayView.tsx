import { useCallback, useState } from "react";
import { getToday, postRequest } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import type { ContentItem } from "@/lib/contentTypes";
import { effectiveFormat } from "@/lib/contentTypes";
import type { Suggestion } from "@/lib/planner";
import { RunModeSelect } from "./RunModeSelect";

export function TodayView({ tenant, onOpen }: { tenant: string; onOpen: (id: string) => void }) {
  const fetch = useCallback(() => getToday(tenant), [tenant]);
  const { data, reload } = useLiveData<{ due: ContentItem[]; suggested: Suggestion[] }>(
    fetch,
    (p) => p.includes(`/content/${tenant}/`)
  );
  const [prompt, setPrompt] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  async function request() {
    if (!prompt.trim()) return;
    const res = await postRequest(tenant, prompt, "linkedin");
    setRequestId(res.id);
    setPrompt("");
    reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 className="ws-h1">Today</h1>
        <p className="ws-sub">What is due, and what to make next.</p>
      </header>

      {!data ? (
        <p className="ws-slate" style={{ fontSize: 13 }}>Loading…</p>
      ) : (
        <>
          <section>
            <div className="ws-label" style={{ marginBottom: 10 }}>Due today</div>
            {data.due.length === 0 ? (
              <p className="ws-slate" style={{ fontSize: 13 }}>Nothing scheduled for today.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.due.map((i) => (
                  <button key={i.id} type="button" className="ws-card-btn" onClick={() => onOpen(i.id)}>
                    <div className="ws-serif ws-ink" style={{ fontSize: 15, fontWeight: 600 }}>{i.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <span className="ws-pill ws-pill-accent ws-pill-mono">{effectiveFormat(i)}</span>
                      <span className="ws-pill">{i.angle}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="ws-label" style={{ marginBottom: 10 }}>Suggested this week</div>
            <div className="ws-card" style={{ padding: 4 }}>
              {data.suggested.length === 0 ? (
                <p className="ws-slate" style={{ fontSize: 13, padding: 12, margin: 0 }}>On pace — nothing suggested.</p>
              ) : (
                data.suggested.map((s, n) => (
                  <div
                    key={n}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderTop: n ? "1px solid var(--ws-line)" : "none" }}
                  >
                    <span className="ws-pill ws-pill-mono">{s.channel}/{s.format}</span>
                    <span className="ws-slate" style={{ fontSize: 13 }}>{s.pillar}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="ws-card" style={{ padding: 16 }}>
            <div className="ws-label">Ask for a batch</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                className="ws-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={'e.g. "a week of LinkedIn posts", "3 carousel angles on AI reliability"'}
              />
              <button type="button" className="ws-btn ws-btn-primary" onClick={request} style={{ whiteSpace: "nowrap" }}>
                Request
              </button>
            </div>
            {requestId ? (
              <div style={{ marginTop: 14 }}>
                <RunModeSelect tenant={tenant} action="fulfil-request" targetId={requestId} />
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
