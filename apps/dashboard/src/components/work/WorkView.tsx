import { useEffect, useState, useCallback, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyPrompt } from "@/components/content/CopyPrompt";
import { listWork, getWork, setWorkStatus } from "@/lib/api";
import { capabilityById, promptFor, priorPrepMissing } from "@/lib/capabilities";
import { useLiveData } from "@/hooks/useLiveData";
import type { WorkArtifact, WorkArtifactSummary, WorkCounts } from "@/lib/types";

interface WorkViewProps {
  tenant: string;
  tenantName: string;
  capabilityId: string;
  counts?: WorkCounts;
}

export function WorkView({ tenant, tenantName, capabilityId, counts = {} }: WorkViewProps) {
  const capability = capabilityById(capabilityId);
  const capId = capability?.id ?? "";
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, WorkArtifact>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requested = useRef<Set<string>>(new Set());
  const autoOpened = useRef(false);

  const fetchList = useCallback(() => listWork(tenant, capId), [tenant, capId]);
  const shouldRefetch = useCallback((p: string) => p.includes(`/work/${tenant}/`), [tenant]);
  const { data: items } = useLiveData<WorkArtifactSummary[]>(fetchList, shouldRefetch);

  const loadDetail = useCallback(
    (slug: string) => {
      if (!capability || requested.current.has(slug)) return;
      requested.current.add(slug);
      void getWork(tenant, capability.id, slug).then((d) =>
        setDetails((cur) => ({ ...cur, [slug]: d })),
      );
    },
    [tenant, capability],
  );

  // Reset when switching tenant or capability.
  useEffect(() => {
    setOpenSlugs(new Set());
    setDetails({});
    setShowArchived(false);
    setActionError(null);
    requested.current = new Set();
    autoOpened.current = false;
  }, [tenant, capId]);

  // Open the newest artifact by default, so a single doc shows without a click.
  useEffect(() => {
    if (autoOpened.current || !items || items.length === 0) return;
    autoOpened.current = true;
    const newest = items[0]!.slug;
    setOpenSlugs(new Set([newest]));
    loadDetail(newest);
  }, [items, loadDetail]);

  const toggle = useCallback(
    (slug: string) => {
      setOpenSlugs((cur) => {
        const next = new Set(cur);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        return next;
      });
      loadDetail(slug);
    },
    [loadDetail],
  );

  const changeStatus = useCallback(
    (slug: string, status: "in_review" | "approved" | "archived") => {
      setActionError(null);
      setWorkStatus(tenant, capId, slug, status).catch((e) => {
        setActionError(e instanceof Error ? e.message : String(e));
      });
    },
    [tenant, capId],
  );

  if (!capability) return null;

  const missing = priorPrepMissing(capabilityId, counts);
  const banner =
    missing.length > 0 ? (
      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          Recommend running {missing.map((c) => c.label).join(", ")} before {capability.label}.
        </p>
        <p className="ws-slate" style={{ fontSize: 12, margin: 0 }}>
          Prep steps ground the rest, so start there first.
        </p>
        <CopyPrompt prompt={promptFor(missing[0]!, tenantName)} />
      </div>
    ) : null;

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {banner}
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

  const archivedCount = items.filter((item) => item.status === "archived").length;
  const visibleItems = showArchived ? items : items.filter((item) => item.status !== "archived");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {banner}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="ws-label">{capability.label}</div>
        <p className="ws-slate" style={{ fontSize: 12 }}>
          {capability.description}
        </p>
      </div>
      {archivedCount > 0 ? (
        <button
          type="button"
          className="ws-btn ws-btn-sm"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setShowArchived((cur) => !cur)}
        >
          {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
        </button>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleItems.map((item) => {
          const open = openSlugs.has(item.slug);
          const detail = details[item.slug];
          return (
            <div key={item.slug} className="ws-card" style={{ overflow: "hidden" }}>
              <button
                type="button"
                className="ws-work-row"
                aria-expanded={open}
                onClick={() => toggle(item.slug)}
              >
                <span className="ws-work-chevron" data-open={open} aria-hidden="true">
                  ▸
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block" }}>{item.title}</span>
                  <span className="ws-slate" style={{ fontSize: 12, display: "flex", gap: 8 }}>
                    {item.created ? <span>{item.created}</span> : null}
                    {item.status ? <span className="ws-pill ws-pill-mono">{item.status}</span> : null}
                  </span>
                </span>
              </button>
              {open ? (
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {detail ? (
                    <div className="ws-prose">
                      <Markdown remarkPlugins={[remarkGfm]}>{detail.body}</Markdown>
                    </div>
                  ) : (
                    <span className="ws-slate" style={{ fontSize: 12 }}>-</span>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {item.status !== "approved" && item.status !== "archived" ? (
                      <button
                        type="button"
                        className="ws-btn ws-btn-sm"
                        onClick={() => changeStatus(item.slug, "approved")}
                      >
                        Approve
                      </button>
                    ) : null}
                    {item.status !== "archived" ? (
                      <button
                        type="button"
                        className="ws-btn ws-btn-sm"
                        onClick={() => changeStatus(item.slug, "archived")}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ws-btn ws-btn-sm"
                        onClick={() => changeStatus(item.slug, "in_review")}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                  {actionError ? (
                    <p style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5, color: "#e5484d" }}>
                      Action failed: {actionError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
