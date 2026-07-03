import { useEffect, useState } from "react";
import type { DesignTokens } from "@/design-system/types";
import { getDesignTokens, getPreviews, designPreviewUrl } from "@/lib/api";

interface Props {
  tenant: string;
}

export function DesignSystemPanel({ tenant }: Props) {
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void Promise.all([getDesignTokens(tenant), getPreviews(tenant)]).then(([t, p]) => {
      setTokens(t);
      setPreviews(p);
      setLoading(false);
    });
  }, [tenant]);

  if (loading) {
    return <p className="ws-slate" style={{ fontSize: 13, padding: "16px 0" }}>Loading design system…</p>;
  }

  if (tokens === null && previews.length === 0) {
    return (
      <div className="ws-card" style={{ padding: 20 }}>
        <p className="ws-slate" style={{ fontSize: 13, margin: 0, textAlign: "center" }}>
          No design system yet for <span className="ws-ink">{tenant}</span>. Run the design-system step to generate one.
        </p>
      </div>
    );
  }

  const colorEntries = tokens !== null ? Object.entries(tokens.color) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {tokens !== null ? (
        <div className="ws-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div className="ws-label" style={{ marginBottom: 10 }}>Colors</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {colorEntries.map(([name, hex]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--ws-line)", backgroundColor: hex }} title={hex} />
                  <span className="ws-slate" style={{ fontSize: 10, textAlign: "center", maxWidth: 48, overflowWrap: "break-word" }}>{name}</span>
                  <span className="ws-mono ws-slate" style={{ fontSize: 9 }}>{hex}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="ws-label" style={{ marginBottom: 8 }}>Typography</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 13 }}>
              <div><span className="ws-slate">Display: </span><span className="ws-ink" style={{ fontWeight: 500 }}>{tokens.font.display}</span></div>
              <div><span className="ws-slate">Body: </span><span className="ws-ink" style={{ fontWeight: 500 }}>{tokens.font.body}</span></div>
              {tokens.font.mono ? <div><span className="ws-slate">Mono: </span><span className="ws-ink" style={{ fontWeight: 500 }}>{tokens.font.mono}</span></div> : null}
            </div>
          </div>
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ws-label">Previews</div>
          {previews.map((name) => (
            <div key={name} className="ws-card" style={{ padding: 12 }}>
              <div className="ws-mono ws-slate" style={{ fontSize: 11, marginBottom: 8 }}>{name}</div>
              <iframe src={designPreviewUrl(tenant, name)} title={name} style={{ width: "100%", height: 320, border: 0, borderRadius: 8 }} loading="lazy" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
