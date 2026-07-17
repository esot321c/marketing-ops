import { useEffect } from "react";
import type { ContentItem } from "@/lib/contentTypes";
import { effectiveFormat } from "@/lib/contentTypes";

export function IdeaReviewPopup({
  item,
  onMoveToDrafting,
  onOpenComposer,
  onClose,
  actionError = null,
}: {
  item: ContentItem;
  onMoveToDrafting: (id: string) => void;
  onOpenComposer: (id: string) => void;
  onClose: () => void;
  actionError?: string | null;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="idea-review-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--ws-ink) 45%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        className="ws-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px, 100%)", maxHeight: "85vh", overflowY: "auto", padding: 20 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <h2 className="ws-serif ws-ink" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{item.title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ws-btn ws-btn-sm"
            style={{ padding: "4px 9px" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span className="ws-pill ws-pill-mono">{item.pillar}</span>
          <span className="ws-pill ws-pill-mono">{effectiveFormat(item)}</span>
        </div>

        {item.angle ? (
          <>
            <div className="ws-label" style={{ marginTop: 16 }}>Angle</div>
            <p className="ws-slate" style={{ fontSize: 13.5, lineHeight: 1.6, margin: "6px 0 0" }}>{item.angle}</p>
          </>
        ) : null}

        {item.source.length > 0 ? (
          <>
            <div className="ws-label" style={{ marginTop: 16 }}>Sources</div>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {item.source.map((s, n) => (
                <li key={n} className="ws-slate" style={{ fontSize: 13, lineHeight: 1.6 }}>{s}</li>
              ))}
            </ul>
          </>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            className="ws-btn ws-btn-primary"
            onClick={() => onMoveToDrafting(item.id)}
          >
            Move to drafting
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={() => onOpenComposer(item.id)}
          >
            Open in Composer
          </button>
        </div>

        {actionError ? (
          <p style={{ fontSize: 11.5, margin: "12px 0 0", lineHeight: 1.5, color: "#e5484d" }}>
            Action failed: {actionError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
