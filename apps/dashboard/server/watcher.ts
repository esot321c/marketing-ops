import chokidar from "chokidar";
import path from "node:path";
import { dataRoot } from "./paths.js";
import { broadcast } from "./sse.js";

export function startWatcher() {
  const watcher = chokidar.watch(dataRoot, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });
  const emit = (event: string) => (filePath: string) => {
    const rel = path.relative(dataRoot, filePath).split(path.sep).join("/");
    broadcast("change", { event, path: `data/${rel}` });
  };
  watcher.on("add", emit("add")).on("change", emit("change")).on("unlink", emit("unlink"));
  return watcher;
}
