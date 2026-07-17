import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { postIntake, uploadAsset } from "@/lib/api";

interface IntakeFormProps {
  tenant: string;
  onSaved?: () => void;
}

export function IntakeForm({ tenant, onSaved }: IntakeFormProps) {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const result = await uploadAsset(tenant, file);
        if (result.ok) setUploadedFiles((prev) => [...prev, result.file]);
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragOver(true); }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragOver(false); }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }
  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const result = await postIntake(tenant, { linkedinUrl, websiteUrl, notes });
      if (!result.ok) { setError("Save failed. Please try again."); return; }
      onSaved?.();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const field = { display: "flex", flexDirection: "column", gap: 6 } as const;

  return (
    <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="ws-label">Import &amp; intake</span>

      <div style={field}>
        <label className="ws-label" htmlFor="linkedin-url">Current LinkedIn URL</label>
        <input id="linkedin-url" type="url" className="ws-input" placeholder="https://linkedin.com/company/..."
          value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
      </div>

      <div style={field}>
        <label className="ws-label" htmlFor="website-url">Website / blog URL</label>
        <input id="website-url" type="url" className="ws-input" placeholder="https://example.com"
          value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
      </div>

      <div style={field}>
        <label className="ws-label" htmlFor="notes">Anything else we should know</label>
        <textarea id="notes" className="ws-input" rows={4} style={{ resize: "vertical" }}
          placeholder="Tone of voice, key differentiators, audiences..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={field}>
        <span className="ws-label">Assets</span>
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            border: "2px dashed var(--ws-line)", borderRadius: 12, padding: "24px", fontSize: 13, cursor: "pointer",
            color: "var(--ws-slate)",
            background: isDragOver ? "color-mix(in srgb, var(--ws-accent) 10%, var(--ws-paper))" : "transparent",
            borderColor: isDragOver ? "var(--ws-accent)" : "var(--ws-line)",
          }}
        >
          <Upload className="h-5 w-5" />
          <span>Drop files here, or click to browse</span>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
        {uploadedFiles.length > 0 ? (
          <ul style={{ display: "flex", flexDirection: "column", gap: 4, margin: 0, padding: 0, listStyle: "none" }}>
            {uploadedFiles.map((filePath) => (
              <li key={filePath} className="ws-mono" style={{ fontSize: 11, color: "var(--ws-slate)", background: "color-mix(in srgb, var(--ws-band) 55%, var(--ws-paper))", borderRadius: 6, padding: "6px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filePath}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="ws-slate" style={{ fontSize: 11, margin: 0 }}>
          Saved to <code className="ws-mono">data/{tenant}/setup/assets/</code>
        </p>
      </div>

      {error ? <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p> : null}

      <button type="button" className="ws-btn ws-btn-primary" onClick={handleSubmit} disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
        {saving ? "Saving…" : "Save & continue"}
      </button>
    </div>
  );
}
