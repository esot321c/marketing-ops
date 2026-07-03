import { useCallback } from "react";
import { getBoard } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { BOARD_STATES } from "@/lib/contentLibrary";
import type { ContentItem, ContentState } from "@/lib/contentTypes";

const LABELS: Record<ContentState, string> = {
  idea: "Ideas",
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  measured: "Measured",
};

export function PipelineBoard({ tenant, onOpen }: { tenant: string; onOpen: (id: string) => void }) {
  const fetch = useCallback(() => getBoard(tenant), [tenant]);
  const { data } = useLiveData<Record<ContentState, ContentItem[]>>(fetch, (p) => p.includes(`/content/${tenant}/`));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 className="ws-h1">Pipeline board</h1>
        <p className="ws-sub">Every piece, grouped by where it is in the lifecycle.</p>
      </header>

      {!data ? (
        <p className="ws-slate" style={{ fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 12 }}>
          {BOARD_STATES.map((state) => (
            <div key={state}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                <span className="ws-ink" style={{ fontSize: 12.5, fontWeight: 600 }}>{LABELS[state]}</span>
                <span className="ws-slate ws-mono" style={{ fontSize: 11 }}>{data[state].length}</span>
              </div>
              <div
                style={{
                  background: "color-mix(in srgb, var(--ws-band) 40%, transparent)",
                  border: "1px solid var(--ws-line)",
                  borderRadius: 12,
                  padding: 8,
                  minHeight: 92,
                }}
              >
                {data[state].map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="ws-card-btn"
                    onClick={() => onOpen(i.id)}
                    style={{ padding: 10, marginBottom: 8, borderRadius: 10 }}
                  >
                    <div className="ws-ink" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{i.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span className="ws-pill ws-pill-mono">{i.format}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
