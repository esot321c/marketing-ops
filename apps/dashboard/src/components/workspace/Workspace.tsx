import { useCallback, useState } from "react";
import { getInitState, getDesignTokens, approveStage } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { stageById } from "@/lib/initStages";
import { setupSteps, currentStepIndex } from "@/lib/setupNav";
import type { DesignTokens } from "@/design-system/types";
import type { StageId, StageStatus } from "@/lib/types";
import { wsStyle, FALLBACK, BASE_TOKENS } from "./theme";
import type { ThemeMode } from "@/lib/themeMode";
import { WorkspaceSidebar, type Section } from "./WorkspaceSidebar";
import { StageView } from "@/components/setup/StageView";
import { TodayView } from "@/components/content/TodayView";
import { PipelineBoard } from "@/components/content/PipelineBoard";
import { Composer } from "@/components/content/Composer";
import { CadencePanel } from "@/components/content/CadencePanel";
import { LearningsPanel } from "@/components/content/LearningsPanel";
import { Button } from "@/components/ui/button";

const CONTENT_SECTIONS = new Set<Section>(["today", "board", "composer", "cadence", "learnings"]);

export function Workspace({ tenant, tenantName, themeMode }: { tenant: string; tenantName: string; themeMode: ThemeMode }) {
  const fetchState = useCallback(() => getInitState(tenant), [tenant]);
  const { data: init, reload } = useLiveData<Awaited<ReturnType<typeof getInitState>>>(
    fetchState,
    (p) => p.includes(`/setup/${tenant}/`)
  );
  const fetchTokens = useCallback(() => getDesignTokens(tenant), [tenant]);
  const { data: tokens } = useLiveData<DesignTokens | null>(
    fetchTokens,
    (p) => p.includes(`/${tenant}/design-system/`)
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);

  const open = useCallback((id: string) => {
    setOpenId(id);
    setSection("composer");
  }, []);

  const activeTokens = themeMode === "base" ? BASE_TOKENS : (tokens ?? FALLBACK);
  const style = wsStyle(activeTokens);

  if (!init) {
    return <div className="ws ws-fill" style={style}><div className="ws-gate">Loading…</div></div>;
  }

  const steps = setupSteps(init.state);
  const guided = !init.readyToPost;
  const initState = init.state;

  // Default section: guided -> the current step; ready -> today.
  const currentIdx = currentStepIndex(steps);
  const defaultSection: Section = guided
    ? (steps[currentIdx]?.stageId ?? steps[0]!.stageId)
    : "today";
  const active: Section = section ?? defaultSection;

  function approve(stageId: StageId) {
    void approveStage(tenant, stageId).then((res) => {
      reload();
      if (guided && res.readyToPost) {
        setSection("today"); // just completed setup -> land on the dashboard
      } else if (guided) {
        // advance to the next step (recompute after reload happens; pick next stage now)
        const next = setupSteps(res.state).find((s) => s.status === "current");
        setSection(next ? next.stageId : "today");
      }
      // ready mode: a settings re-approve stays on the current section (no forced navigation)
    });
  }

  function stageStatus(stageId: StageId): StageStatus {
    return initState.stages[stageId]?.status ?? "not-started";
  }

  function renderMain() {
    if (CONTENT_SECTIONS.has(active)) {
      if (active === "today") return <TodayView tenant={tenant} onOpen={open} />;
      if (active === "board") return <PipelineBoard tenant={tenant} onOpen={open} />;
      if (active === "composer") return openId ? <Composer tenant={tenant} tenantName={tenantName} itemId={openId} /> : <p className="ws-slate" style={{ fontSize: 13 }}>Open a piece from Today or the board.</p>;
      if (active === "cadence") return <CadencePanel tenant={tenant} />;
      if (active === "learnings") return <LearningsPanel tenant={tenant} />;
    }
    // otherwise `active` is a setup stage id
    const stageId = active as StageId;
    const def = stageById(stageId);
    const stageNode = (
      <StageView
        tenant={tenant}
        tenantName={tenantName}
        stageId={stageId}
        status={stageStatus(stageId)}
        onApprove={() => approve(stageId)}
        onChanged={reload}
      />
    );

    if (guided) {
      const idx = steps.findIndex((s) => s.stageId === stageId);
      const prev = steps[idx - 1];
      return (
        <div>
          <div className="ws-stephead">
            <div>
              <div className="k">Step {idx + 1} of {steps.length} · Setup</div>
              <h2>{def?.label ?? stageId}</h2>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" disabled={!prev} onClick={() => prev && setSection(prev.stageId)}>← Back</Button>
            </div>
          </div>
          {stageNode}
        </div>
      );
    }

    // ready mode: settings header
    return (
      <div>
        <div style={{ marginBottom: 18 }}>
          <h1 className="ws-h1">{def?.label ?? stageId}</h1>
          <p className="ws-sub">Revisit this setup section. Edits re-run through the agent.</p>
        </div>
        {stageNode}
      </div>
    );
  }

  return (
    <div className="ws ws-fill grid grid-cols-1 md:grid-cols-[224px_1fr]" style={style}>
      <WorkspaceSidebar
        mode={guided ? "guided" : "ready"}
        tenantName={tenantName}
        steps={steps}
        section={active}
        onSelect={(s) => { setSection(s); }}
        composerEnabled={openId !== null}
      />
      <main className="ws-main">{renderMain()}</main>
    </div>
  );
}
