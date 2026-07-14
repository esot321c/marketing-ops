import { CopyText } from "./CopyText";

export function CaptionCard({ caption }: { caption?: string }) {
  const has = typeof caption === "string" && caption.trim().length > 0;
  return (
    <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="ws-label">Caption</span>
      {has ? (
        <CopyText text={caption!} />
      ) : (
        <p className="ws-slate" style={{ fontSize: 12, margin: 0 }}>No caption yet.</p>
      )}
    </div>
  );
}
