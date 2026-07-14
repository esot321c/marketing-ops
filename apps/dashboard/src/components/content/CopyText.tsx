import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyText({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? <span className="ws-label">{label}</span> : null}
      <div style={{ position: "relative" }}>
        <pre className="ws-pre" style={{ margin: 0, paddingRight: 42 }}>{text}</pre>
        <button
          type="button"
          className="ws-btn ws-btn-sm"
          aria-label={label ?? "Copy text"}
          onClick={handleCopy}
          style={{ position: "absolute", top: 7, right: 7, padding: "4px 8px" }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
