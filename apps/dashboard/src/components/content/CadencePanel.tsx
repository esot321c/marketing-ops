import { useCallback } from "react";
import { getCadence, getToday } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { CopyPrompt } from "@/components/content/CopyPrompt";
import type { ContentItem, Cadence } from "@/lib/contentTypes";
import type { Suggestion } from "@/lib/planner";

export function CadencePanel({ tenant, tenantName }: { tenant: string; tenantName: string }) {
  const shouldRefetch = useCallback((p: string) => p.includes(`/content/${tenant}/`), [tenant]);

  const fetchCadence = useCallback(() => getCadence(tenant), [tenant]);
  const { data: cadence } = useLiveData<Cadence>(fetchCadence, shouldRefetch);

  const fetchToday = useCallback(() => getToday(tenant), [tenant]);
  const { data: today } = useLiveData<{ due: ContentItem[]; suggested: Suggestion[] }>(fetchToday, shouldRefetch);

  const perWeekEntries = cadence ? Object.entries(cadence.perWeek) : [];
  const perWeekTotal = perWeekEntries.reduce((sum, [, n]) => sum + n, 0);
  const maxWeight = cadence ? Math.max(1, ...cadence.pillars.map((p) => p.weight)) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header>
        <h1 className="ws-h1">Cadence</h1>
        <p className="ws-sub">The baseline rhythm the planner flexes when it suggests work.</p>
      </header>

      <div className="ws-card" style={{ padding: 20, maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        <section>
          <div className="ws-label" style={{ marginBottom: 8 }}>Weekly targets</div>
          {perWeekEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {perWeekEntries.map(([key, count]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span className="ws-mono ws-ink">{key}</span>
                  <span className="ws-slate">{count} / week</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, paddingTop: 4 }}>
                <span className="ws-ink">Total</span>
                <span className="ws-ink">{perWeekTotal} / week</span>
              </div>
            </div>
          ) : (
            <p className="ws-slate" style={{ fontSize: 13, margin: 0 }}>No weekly targets set yet.</p>
          )}
        </section>

        <hr className="ws-rule" />

        <section>
          <div className="ws-label" style={{ marginBottom: 8 }}>Pillars</div>
          {cadence && cadence.pillars.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cadence.pillars.map((pillar) => (
                <div key={pillar.name} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span className="ws-ink">{pillar.name}</span>
                    <span className="ws-slate">{pillar.weight}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--ws-band)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(pillar.weight / maxWeight) * 100}%`,
                        background: "var(--ws-accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ws-slate" style={{ fontSize: 13, margin: 0 }}>No pillars set yet.</p>
          )}
          <p className="ws-soft" style={{ fontSize: 12, margin: "8px 0 0", lineHeight: 1.5 }}>
            The learning loop tunes these weights from what performs.
          </p>
        </section>

        {cadence && cadence.engagement && (
          <>
            <hr className="ws-rule" />
            <section>
              <div className="ws-label" style={{ marginBottom: 6 }}>Engagement</div>
              <p className="ws-ink" style={{ fontSize: 13, margin: 0 }}>{cadence.engagement}</p>
            </section>
          </>
        )}

        {cadence && cadence.updatedBy.length > 0 && (
          <>
            <hr className="ws-rule" />
            <section>
              <div className="ws-label" style={{ marginBottom: 8 }}>Tune history</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cadence.updatedBy.map((update, i) => (
                  <div key={`${update.learningId}-${i}`} style={{ fontSize: 13 }}>
                    <span className="ws-mono ws-slate">{update.at.slice(0, 10)}</span>
                    <span className="ws-ink"> {update.summary}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <hr className="ws-rule" />

        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="ws-serif ws-ink" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
            {today ? today.suggested.length : "—"}
          </span>
          <span className="ws-slate" style={{ fontSize: 13 }}>pieces suggested this week</span>
        </div>
      </div>

      <div className="ws-card" style={{ padding: 20, maxWidth: 560, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="ws-label">Adjust cadence in chat</div>
        <CopyPrompt prompt={`Adjust the cadence for ${tenantName}`} />
        <p className="ws-soft" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          The agent edits the cadence file; this page updates when it changes.
        </p>
      </div>
    </div>
  );
}
