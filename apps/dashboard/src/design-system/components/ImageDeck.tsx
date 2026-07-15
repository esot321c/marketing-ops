import { useState } from "react";
import type { DesignTokens } from "../types";

export interface ImageDeckProps {
  tokens: DesignTokens;
  images: { src: string; alt: string }[];
}

export function ImageDeck({ tokens, images }: ImageDeckProps) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  if (current === undefined) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <img
        src={current.src}
        alt={current.alt}
        style={{ width: 360, height: 360, objectFit: "cover", display: "block", background: tokens.color.band }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {images.map((_, i) => (
          <button key={i} aria-label={`slide ${i + 1}`} onClick={() => setIndex(i)}
            style={{ width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer",
              background: i === index ? tokens.color.accent : tokens.color.line }} />
        ))}
      </div>
    </div>
  );
}
