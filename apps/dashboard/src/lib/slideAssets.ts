// Naming convention for generated slide images inside an item's asset
// directory: slide-NN.<ext>, NN 1-based and zero-padded to two digits.
const SLIDE_IMAGE = /^slide-(\d{2})\.(png|jpe?g|webp)$/;

export function slideFileName(slide: number, mime: string): string {
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  return `slide-${String(slide).padStart(2, "0")}.${ext}`;
}

export function slideImageFor(files: string[], slide: number): string | undefined {
  return files.find((f) => {
    const m = SLIDE_IMAGE.exec(f);
    return m !== null && Number(m[1]) === slide;
  });
}

export function allSlideImages(files: string[], count: number): boolean {
  if (count <= 0) return false;
  for (let i = 1; i <= count; i++) {
    if (slideImageFor(files, i) === undefined) return false;
  }
  return true;
}
