import path from "node:path";

export const researchAssetRoot = path.resolve(process.cwd(), "..", "..", "data", "assets", "research");

export function resolveResearchAssetPath(assetPath: string): string | null {
  if (typeof assetPath !== "string" || !assetPath.startsWith("data/assets/research/")) {
    return null;
  }

  const relativePath = assetPath.replace(/^data\/assets\/research\//, "");
  const resolvedPath = path.resolve(researchAssetRoot, relativePath);

  if (resolvedPath !== researchAssetRoot && !resolvedPath.startsWith(researchAssetRoot + path.sep)) {
    return null;
  }

  return resolvedPath;
}
