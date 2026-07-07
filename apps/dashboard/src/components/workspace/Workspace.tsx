import { useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { getInitState, getDesignTokens, approveStage } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { stageById, STAGES } from "@/lib/initStages";
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
import { CAPABILITIES } from "@/lib/capabilities";
import { WorkView } from "@/components/work/WorkView";
import { AskView } from "@/components/work/AskView";

const CONTENT_SECTIONS = new Set<Section>(["today", "board", "composer", "cadence", "learnings"]);
const STAGE_SECTIONS = new Set<string>(STAGES.map((s) => s.id));
const WORK_SECTIONS = new Set<string>(CAPABILITIES.map((c) => c.id));
function isSection(v: string): v is Section {
  return CONTENT_SECTIONS.has(v as Section) || STAGE_SECTIONS.has(v) || WORK_SECTIONS.has(v) || v === "ask";
}

export function Workspace({ tenant, tenantName, themeMode }: { tenant: string; tenantName: string; themeMode: ThemeMode }) {
  const params = useParams<{ section?: string; itemId?: string }>();
  const navigate = useNavigate();
  const search = `?tenant=${encodeURIComponent(tenant)}`;

  // /composer/:itemId resolves to the composer section with an open item.
  const itemId = params.itemId;
  const routeSection: string | undefined = itemId !== undefined ? "composer" : params.section;

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

  const open = useCallback((id: string) => navigate(`/composer/${id}${search}`), [navigate, search]);

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

  // Resolve the active section from the path. Redirect to the default when it is
  // absent, unknown, or a content/work/ask section while setup is still guided
  // (these all stay locked until ready). This is what makes a deep URL survive a refresh.
  const contentLocked =
    guided &&
    routeSection !== undefined &&
    (CONTENT_SECTIONS.has(routeSection as Section) || WORK_SECTIONS.has(routeSection) || routeSection === "ask");
  if (routeSection === undefined || !isSection(routeSection) || contentLocked) {
    return <Navigate to={`/${defaultSection}${search}`} replace />;
  }
  const active: Section = routeSection;

  function go(s: Section) {
    navigate(s === "composer" ? `/composer/${itemId ?? ""}${search}` : `/${s}${search}`);
  }

  function hrefFor(s: Section): string {
    return s === "composer" ? `/composer/${itemId ?? ""}${search}` : `/${s}${search}`;
  }

  function approve(stageId: StageId) {
    void approveStage(tenant, stageId).then((res) => {
      reload();
      if (guided && res.readyToPost) {
        go("today"); // just completed setup -> land on the dashboard
      } else if (guided) {
        // advance to the next step
        const next = setupSteps(res.state).find((s) => s.status === "current");
        go(next ? next.stageId : "today");
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
      if (active === "composer") return itemId ? <Composer tenant={tenant} tenantName={tenantName} itemId={itemId} /> : <p className="ws-slate" style={{ fontSize: 13 }}>Open a piece from Today or the board.</p>;
      if (active === "cadence") return <CadencePanel tenant={tenant} tenantName={tenantName} />;
      if (active === "learnings") return <LearningsPanel tenant={tenant} />;
    }
    if (WORK_SECTIONS.has(active)) {
      return <WorkView tenant={tenant} tenantName={tenantName} capabilityId={active} />;
    }
    if (active === "ask") {
      return <AskView tenantName={tenantName} />;
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
              <Button variant="outline" disabled={!prev} onClick={() => prev && go(prev.stageId)}>← Back</Button>
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
        hrefFor={hrefFor}
        composerEnabled={itemId !== undefined}
      />
      <main className="ws-main">{renderMain()}</main>
    </div>
  );
}
