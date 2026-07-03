import path from "node:path";
// data/ is two levels up from apps/dashboard
export const dataRoot = path.resolve(process.cwd(), "..", "..", "data");
