import { useCallback } from "react";
import { listItemAssets, itemAssetUrl, uploadItemAsset } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { slideFileName, slideImageFor, allSlideImages } from "@/lib/slideAssets";
import { CopyText } from "./CopyText";
import { ImageDeck } from "@/design-system/components/ImageDeck";
import type { Asset, CarouselSlideContent, ImagePackage } from "@/lib/contentTypes";
import type { DesignTokens } from "@/design-system/types";

export function CarouselVisualPanelView({ asset, slides, files, tokens, urlFor, onUpload }: {
  asset: Asset;
  slides: CarouselSlideContent[];
  files: string[];
  tokens: DesignTokens | null;
  urlFor: (file: string) => string;
  onUpload: (slide: number, file: File) => void;
}) {
  const pkg = asset.package as ImagePackage;
  const prompts = pkg.slidePrompts ?? [];
  const promptless = pkg.slidePrompts === undefined;
  const thumb = promptless ? 84 : 120;
  const complete = allSlideImages(files, slides.length);
  return (
    <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="ws-label">Slide images</span>
        {pkg.treatment ? <span className="ws-pill ws-pill-mono">{pkg.treatment}</span> : null}
        <span className="ws-pill ws-pill-mono">{asset.status}</span>
        {asset.tool ? <span className="ws-slate" style={{ fontSize: 11 }}>via {asset.tool}</span> : null}
      </div>

      {complete && tokens ? (
        <div className="ws-stage" style={{ display: "flex", justifyContent: "center" }}>
          <ImageDeck tokens={tokens} images={slides.map((s, i) => ({
            src: urlFor(slideImageFor(files, i + 1) ?? ""),
            alt: s.heading,
          }))} />
        </div>
      ) : null}

      {slides.map((s, i) => {
        const n = i + 1;
        const prompt = prompts.find((p) => p.slide === n);
        const img = slideImageFor(files, n);
        return (
          <div key={n} style={{ display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${thumb}px`, gap: 10, alignItems: promptless ? "center" : "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ws-label">{String(n).padStart(2, "0")}  {s.heading}</span>
              {prompt
                ? <CopyText text={prompt.prompt} />
                : pkg.slidePrompts !== undefined
                  ? <span className="ws-slate" style={{ fontSize: 12 }}>No prompt yet.</span>
                  : null}
            </div>
            {img ? (
              <img src={urlFor(img)} alt={`Slide ${n} image`}
                style={{ width: thumb, height: thumb, objectFit: "cover", borderRadius: 6 }} />
            ) : (
              <label className="ws-btn ws-btn-sm" style={{ textAlign: "center", cursor: "pointer" }}>
                Add image
                <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(n, f);
                    e.target.value = "";
                  }} />
              </label>
            )}
          </div>
        );
      })}

      {prompts.filter((p) => p.slide > slides.length).map((p) => (
        <div key={`extra-${p.slide}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="ws-label">{String(p.slide).padStart(2, "0")} (no matching slide)</span>
          <CopyText text={p.prompt} />
        </div>
      ))}

      <CopyText text={pkg.prompt} label={pkg.slidePrompts !== undefined ? "Deck style prompt" : "Render notes"} />
    </div>
  );
}

export function CarouselVisualPanel({ tenant, itemId, asset, slides, tokens }: {
  tenant: string;
  itemId: string;
  asset: Asset;
  slides: CarouselSlideContent[];
  tokens: DesignTokens | null;
}) {
  const fetchFiles = useCallback(() => listItemAssets(tenant, itemId), [tenant, itemId]);
  const { data: files, reload } = useLiveData<string[]>(
    fetchFiles,
    (p) => p.includes(`/content/${tenant}/assets/${itemId}`)
  );
  async function handleUpload(slide: number, file: File) {
    await uploadItemAsset(tenant, itemId, asset.id, file, slideFileName(slide, file.type));
    reload();
  }
  return (
    <CarouselVisualPanelView asset={asset} slides={slides} files={files ?? []} tokens={tokens}
      urlFor={(f) => itemAssetUrl(tenant, itemId, f)}
      onUpload={(n, f) => { void handleUpload(n, f); }} />
  );
}
