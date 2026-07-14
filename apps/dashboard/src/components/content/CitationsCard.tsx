import type { Citation } from "@/lib/contentTypes";
import { CopyText } from "./CopyText";

export function CitationsCard({ citations }: { citations?: Citation[] }) {
  const list = citations ?? [];
  return (
    <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="ws-label">Sources</span>
      {list.length === 0 ? (
        <p className="ws-slate" style={{ fontSize: 12, margin: 0 }}>No sources cited.</p>
      ) : (
        list.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="ws-accent" style={{ fontSize: 13 }}>
              {c.label}
            </a>
            <CopyText text={c.url} />
          </div>
        ))
      )}
    </div>
  );
}
