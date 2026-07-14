import { useState } from "react";
import type { DesignTokens } from "../types";
import { CarouselSlide } from "./CarouselSlide";
import type { CarouselSlideContent } from "@/lib/contentTypes";

export interface CarouselDeckProps {
  tokens: DesignTokens;
  slides: CarouselSlideContent[];
  brand: string;
  url: string;
}

export function CarouselDeck({ tokens, slides, brand, url }: CarouselDeckProps) {
  const [index, setIndex] = useState(0);
  const current = slides[index];
  if (current === undefined) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <CarouselSlide
        tokens={tokens}
        index={index + 1}
        total={slides.length}
        title={current.heading}
        body={current.body}
        bullets={current.bullets}
        dark={current.dark ?? false}
        brand={brand}
        url={url}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {slides.map((_, i) => (
          <button key={i} aria-label={`slide ${i + 1}`} onClick={() => setIndex(i)}
            style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer",
              background: i === index ? tokens.color.accent : tokens.color.line }} />
        ))}
      </div>
    </div>
  );
}
