import { useEffect, useState, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyPrompt } from "@/components/content/CopyPrompt";
import { listWork, getWork } from "@/lib/api";
import { capabilityById, promptFor } from "@/lib/capabilities";
import { useLiveData } from "@/hooks/useLiveData";
import type { WorkArtifact, WorkArtifactSummary } from "@/lib/types";

interface WorkViewProps {
  tenant: string;
  tenantName: string;
  capabilityId: string;
}

export function WorkView({ tenant, tenantName, capabilityId }: WorkViewProps) {
  const capability = capabilityById(capabilityId);
  const capId = capability?.id ?? "";
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkArtifact | null>(null);

  const fetchList = useCallback(() => listWork(tenant, capId), [tenant, capId]);
  const shouldRefetch = useCallback((p: string) => p.includes(`/work/${tenant}/`), [tenant]);
  const { data: items } = useLiveData<WorkArtifactSummary[]>(fetchList, shouldRefetch);

  useEffect(() => {
    setSelectedSlug(null);
    setDetail(null);
  }, [tenant, capId]);

  useEffect(() => {
    if (!capability || !selectedSlug) {
      setDetail(null);
      return;
    }
    void getWork(tenant, capability.id, selectedSlug).then(setDetail);
  }, [tenant, capability, selectedSlug]);

  if (!capability) return null;

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="ws-slate" style={{ fontSize: 12 }}>
          {capability.description}
        </p>
        <p className="ws-slate" style={{ fontSize: 13 }}>
          No {capability.label} yet. Ask your agent:
        </p>
        <CopyPrompt prompt={promptFor(capability, tenantName)} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="ws-label">{capability.label}</div>
        <p className="ws-slate" style={{ fontSize: 12 }}>
          {capability.description}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <button
            key={item.slug}
            type="button"
            className="ws-card"
            style={{ padding: 12, textAlign: "left", cursor: "pointer" }}
            onClick={() => setSelectedSlug(item.slug)}
          >
            <div>{item.title}</div>
            <div className="ws-slate" style={{ fontSize: 12, display: "flex", gap: 8 }}>
              {item.created ? <span>{item.created}</span> : null}
              {item.status ? <span>{item.status}</span> : null}
            </div>
          </button>
        ))}
      </div>
      {detail ? (
        <div className="ws-card" style={{ padding: 16 }}>
          <div className="ws-prose">
            <Markdown remarkPlugins={[remarkGfm]}>{detail.body}</Markdown>
          </div>
        </div>
      ) : null}
    </div>
  );
}
