import { useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLiveData } from "@/hooks/useLiveData";
import { getStageArtifact, type StageArtifact as Artifact } from "@/lib/api";

interface StageArtifactProps {
  tenant: string;
  stage: string;
}

export function StageArtifact({ tenant, stage }: StageArtifactProps) {
  const fetcher = useCallback(() => getStageArtifact(tenant, stage), [tenant, stage]);
  const shouldRefetch = useCallback((path: string) => path.startsWith(`data/${tenant}/setup/`), [tenant]);
  const { data } = useLiveData<Artifact>(fetcher, shouldRefetch);

  if (!data || data.kind === "none" || data.kind === "design-system") return null;

  if (data.kind === "empty") {
    return (
      <p className="ws-slate" style={{ fontSize: 13, marginTop: 16 }}>
        No artifact generated yet. Run this step through the agent; it will appear here automatically.
      </p>
    );
  }

  return (
    <div className="ws-card" style={{ padding: 16, marginTop: 4 }}>
      <div className="ws-label" style={{ marginBottom: 10 }}>
        Generated artifact{data.path ? <span className="ws-mono" style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>{data.path}</span> : null}
      </div>
      <div className="ws-prose">
        <Markdown remarkPlugins={[remarkGfm]}>{data.content}</Markdown>
      </div>
    </div>
  );
}
