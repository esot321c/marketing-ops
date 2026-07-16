import { useCallback, useState } from "react";
import type { DragEvent } from "react";
import { getBoard, postState } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { BOARD_STATES } from "@/lib/contentLibrary";
import { dropArgs } from "@/lib/boardDrag";
import type { ContentItem, ContentState } from "@/lib/contentTypes";
import { effectiveFormat } from "@/lib/contentTypes";

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
  const { data, reload } = useLiveData<Record<ContentState, ContentItem[]>>(fetch, (p) => p.includes(`/content/${tenant}/`));
  const [dragOver, setDragOver] = useState<ContentState | null>(null);

  async function handleDrop(target: ContentState, e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("application/x-item-id");
    const source = e.dataTransfer.getData("application/x-item-state") as ContentState;
    if (!id || !source) return;
    const today = new Date().toISOString().slice(0, 10);
    const args = dropArgs(source, target, today);
    if (!args) return;
    await postState(tenant, id, args.to, args.date);
    reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 className="ws-h1">Pipeline board</h1>
        <p className="ws-sub">Every piece, grouped by where it is in the lifecycle. Drag a card to move it.</p>
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
                onDragOver={(e) => { e.preventDefault(); setDragOver(state); }}
                onDragLeave={() => setDragOver((s) => (s === state ? null : s))}
                onDrop={(e) => void handleDrop(state, e)}
                style={{
                  background: dragOver === state
                    ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)"
                    : "color-mix(in srgb, var(--ws-band) 40%, transparent)",
                  border: dragOver === state ? "1px solid var(--ws-accent)" : "1px solid var(--ws-line)",
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-item-id", i.id);
                      e.dataTransfer.setData("application/x-item-state", state);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragOver(null)}
                    onClick={() => onOpen(i.id)}
                    style={{ padding: 10, marginBottom: 8, borderRadius: 10, cursor: "grab" }}
                  >
                    <div className="ws-ink" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{i.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span className="ws-pill ws-pill-mono">{effectiveFormat(i)}</span>
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
