import { useState } from "react";
import { Info } from "lucide-react";

export interface Posture {
  hasOauthToken: boolean;
  hasApiKey: boolean;
  localBackend: boolean;
}

export function RunModeInfo({ posture }: { posture: Posture }) {
  const [open, setOpen] = useState(false);
  const billing = posture.localBackend
    ? "Local / self-hosted backend — no Anthropic metering."
    : posture.hasApiKey
      ? "An API key is set. It is the automatic fallback and WILL meter unless you pick subscription mode."
      : posture.hasOauthToken
        ? "Subscription token detected — headless runs use your subscription allowance."
        : "No headless credential — only Chat (copy-paste) is available.";
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="ws-btn ws-btn-sm"
        aria-label="Run mode info"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "5px 8px" }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          className="ws-card"
          style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 306, padding: 12, zIndex: 30, fontSize: 12, lineHeight: 1.5 }}
        >
          <p className="ws-soft" style={{ margin: 0 }}>
            <b className="ws-ink">Chat</b> — paste into an interactive session; refilling allowance; always available.
          </p>
          <p className="ws-soft" style={{ margin: "6px 0 0" }}>
            <b className="ws-ink">Headless, subscription</b> — <code className="ws-mono">claude -p</code> on your subscription token, no API billing.
          </p>
          <p className="ws-soft" style={{ margin: "6px 0 0" }}>
            <b className="ws-ink">Headless, API key</b> — metered API rates; only when you choose it.
          </p>
          <p className="ws-ink" style={{ margin: "8px 0 0", fontWeight: 500 }}>{billing}</p>
        </div>
      ) : null}
    </div>
  );
}
