import { useState } from "react";
import { postStageInput } from "@/lib/api";
import type { StageId } from "@/lib/types";

interface StageInputFormProps {
  tenant: string;
  stage: StageId;
  label: string;
  prompt?: string;
  onSaved?: () => void;
}

export function StageInputForm({ tenant, stage, label, prompt, onSaved }: StageInputFormProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const result = await postStageInput(tenant, stage, content);
      if (!result.ok) { setError("Save failed. Please try again."); return; }
      onSaved?.();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="ws-label">{label}</span>
      <textarea
        className="ws-input"
        rows={5}
        style={{ resize: "vertical" }}
        placeholder={prompt ?? "Notes / preferences for this step"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {error ? <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p> : null}
      <button
        type="button"
        className="ws-btn ws-btn-primary"
        onClick={handleSubmit}
        disabled={saving}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {saving ? "Saving…" : "Save & continue"}
      </button>
    </div>
  );
}
