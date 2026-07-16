import { useCallback, useState } from "react";
import { getItem, getDesignTokens, postState, postRefine } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { CarouselDeck } from "@/design-system/components/CarouselDeck";
import { TextPost } from "@/design-system/components/TextPost";
import { RunModeSelect } from "./RunModeSelect";
import { CopyPrompt } from "./CopyPrompt";
import { CaptionCard } from "./CaptionCard";
import { CitationsCard } from "./CitationsCard";
import { SlideText } from "./SlideText";
import { CarouselVisualPanel } from "./CarouselVisualPanel";
import type { ContentItem, ContentState, Asset, CarouselSlideContent } from "@/lib/contentTypes";
import { effectiveFormat } from "@/lib/contentTypes";
import type { DesignTokens } from "@/design-system/types";

function AssetView({ asset, tokens, brand, slideTextOnly }: { asset: Asset; tokens: DesignTokens | null; brand: string; slideTextOnly?: boolean }) {
  if (asset.route === "local-harness" && asset.content) {
    if (asset.content.type === "copy" && tokens) {
      return (
        <div className="ws-stage" style={{ display: "flex", justifyContent: "center" }}>
          <TextPost tokens={tokens} {...asset.content.copy} />
        </div>
      );
    }
    if (asset.content.type === "slides" && tokens) {
      // With a rendered image deck on the page, the text mock is redundant;
      // keep only the copyable slide script.
      if (slideTextOnly) return <SlideText slides={asset.content.slides} />;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ws-stage" style={{ display: "flex", justifyContent: "center" }}>
            <CarouselDeck tokens={tokens} slides={asset.content.slides} brand={brand} url={brand} />
          </div>
          <SlideText slides={asset.content.slides} />
        </div>
      );
    }
    if (asset.content.type === "markdown") {
      return <pre className="ws-pre" style={{ margin: 0 }}>{asset.content.markdown}</pre>;
    }
  }
  return (
    <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="ws-pill ws-pill-mono">{asset.kind}</span>
        <span className="ws-pill ws-pill-mono">{asset.status}</span>
        {asset.tool ? <span className="ws-slate" style={{ fontSize: 11 }}>via {asset.tool}</span> : null}
      </div>
      {asset.package && "prompt" in asset.package ? <CopyPrompt prompt={asset.package.prompt} /> : null}
    </div>
  );
}

export function Composer({ tenant, tenantName, itemId }: { tenant: string; tenantName: string; itemId: string }) {
  const [instruction, setInstruction] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const fetchItem = useCallback(() => getItem(tenant, itemId), [tenant, itemId]);
  const { data: item, reload } = useLiveData<ContentItem>(fetchItem, (p) => p.includes(`/content/${tenant}/items/`));
  const fetchTokens = useCallback(() => getDesignTokens(tenant), [tenant]);
  const { data: tokens } = useLiveData<DesignTokens | null>(fetchTokens, (p) => p.includes(`/${tenant}/design-system/`));
  if (!item) return <p className="ws-slate" style={{ fontSize: 13 }}>Loading…</p>;
  const brand = tenantName;
  const slidesAsset = item.assets.find((a) => a.content?.type === "slides");
  const slides: CarouselSlideContent[] =
    slidesAsset?.content?.type === "slides" ? slidesAsset.content.slides : [];
  const isVisualPanel = (a: Asset) =>
    a.kind === "carousel-visual" && a.package?.kind === "image" && slides.length > 0;
  const orderedAssets = [...item.assets].sort((a, b) => Number(isVisualPanel(b)) - Number(isVisualPanel(a)));
  const hasVisualPanel = item.assets.some(isVisualPanel);

  async function queueNote() {
    if (!instruction.trim()) return;
    await postRefine(tenant, itemId, instruction);
    setInstruction("");
    reload();
  }

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function setState(to: ContentState, date?: string) {
    setActionError(null);
    try {
      await postState(tenant, itemId, to, date);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 className="ws-h1" style={{ fontSize: "1.35rem" }}>{item.title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <span className="ws-pill ws-pill-mono">{item.state}</span>
          <span className="ws-pill ws-pill-accent">{effectiveFormat(item)}</span>
          <span className="ws-pill">{item.angle}</span>
        </div>
      </header>

      <CaptionCard caption={item.caption} />
      <CitationsCard citations={item.citations} />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 22, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {orderedAssets.map((a) => isVisualPanel(a)
            ? <CarouselVisualPanel key={a.id} tenant={tenant} itemId={itemId} asset={a} slides={slides} tokens={tokens} />
            : <AssetView key={a.id} asset={a} tokens={tokens} brand={brand} slideTextOnly={hasVisualPanel} />)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="ws-label">Refine with the agent</span>
            <textarea
              className="ws-input"
              rows={3}
              style={{ resize: "vertical" }}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. tighten slide 3, lead slide 4 with the number"
            />
            <p className="ws-slate" style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
              Run saves your note to this piece and hands the agent an instruction that includes it.
            </p>
            <RunModeSelect tenant={tenant} action="refine" targetId={itemId} beforeRun={queueNote} />
          </div>

          <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="ws-label">Actions</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="ws-btn ws-btn-primary ws-btn-sm" onClick={() => { void setState("approved"); }}>
                Approve
              </button>
              <button type="button" className="ws-btn ws-btn-sm" onClick={() => { void setState("scheduled", today()); }}>
                Schedule today
              </button>
              <button type="button" className="ws-btn ws-btn-sm" onClick={() => { void setState("posted", today()); }}>
                Mark posted
              </button>
            </div>
            {actionError ? (
              <p style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5, color: "#e5484d" }}>
                Action failed: {actionError}
              </p>
            ) : null}
            <p className="ws-slate" style={{ fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
              {tenantName}: refine reads best in Chat; one-shot drafting suits Headless.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
