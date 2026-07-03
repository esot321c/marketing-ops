import { useCallback } from "react";
import { getToday } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import type { ContentItem } from "@/lib/contentTypes";
import type { Suggestion } from "@/lib/planner";

export function CadencePanel({ tenant }: { tenant: string }) {
  const fetch = useCallback(() => getToday(tenant), [tenant]);
  const { data } = useLiveData<{ due: ContentItem[]; suggested: Suggestion[] }>(
    fetch,
    (p) => p.includes(`/content/${tenant}/`)
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 className="ws-h1">Cadence</h1>
        <p className="ws-sub">The baseline rhythm the planner flexes when it suggests work.</p>
      </header>
      <div className="ws-card" style={{ padding: 20, maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="ws-serif ws-ink" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
            {data ? data.suggested.length : "—"}
          </span>
          <span className="ws-slate" style={{ fontSize: 13 }}>pieces suggested this week</span>
        </div>
        <hr className="ws-rule" />
        <p className="ws-soft" style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Suggestions come from the tenant&rsquo;s <code className="ws-mono">cadence.json</code> — weekly targets per
          channel and format, and pillar weights that the learning loop auto-tunes from what performs. Editing the
          cadence directly is a later step; for now the agent keeps it current.
        </p>
      </div>
    </div>
  );
}
