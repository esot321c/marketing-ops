import { CopyText } from "./CopyText";
import type { CarouselSlideContent } from "@/lib/contentTypes";

export function slidesToText(slides: CarouselSlideContent[]): string {
  return slides
    .map((s, i) => {
      const n = String(i + 1).padStart(2, "0");
      const lines = [`${n}  ${s.heading}`];
      if (s.body) lines.push(s.body);
      if (s.bullets) lines.push(...s.bullets.map((b) => `- ${b}`));
      return lines.join("\n");
    })
    .join("\n\n");
}

export function SlideText({ slides }: { slides: CarouselSlideContent[] }) {
  if (slides.length === 0) return null;
  return (
    <div className="ws-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="ws-label">Slide text</span>
      <CopyText text={slidesToText(slides)} />
    </div>
  );
}
