import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="ws-label">Paste this into the chat</span>
      <div style={{ position: "relative" }}>
        <pre className="ws-pre" style={{ margin: 0, paddingRight: 42 }}>{prompt}</pre>
        <button
          type="button"
          className="ws-btn ws-btn-sm"
          aria-label="Copy prompt"
          onClick={handleCopy}
          style={{ position: "absolute", top: 7, right: 7, padding: "4px 8px" }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
