import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { streamSSE } from "hono/streaming";
import { mkdir } from "node:fs/promises";
import chokidar from "chokidar";
import { addClient, removeClient } from "./sse.js";
import { startWatcher } from "./watcher.js";
import { registerRoutes } from "./routes.js";
import { registerWorkRoutes } from "./workRoutes.js";
import { watchImports } from "./analyticsImport.js";
import { analyticsImportsRoot } from "../src/lib/setupPaths.js";

const app = new Hono();
registerRoutes(app);
registerWorkRoutes(app);

app.get("/events", (c) =>
  streamSSE(c, async (stream) => {
    const client = addClient((event, data) => {
      void stream.writeSSE({ event, data: JSON.stringify(data) });
    });
    stream.onAbort(() => removeClient(client));
    // keep-alive ping every 25s
    while (true) { await stream.writeSSE({ event: "ping", data: "1" }); await stream.sleep(25_000); }
  })
);

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }));
  // SPA fallback: client-side routes (e.g. /board?tenant=..) have no file on
  // disk. API and /events are registered above and match first; anything else
  // that reaches here gets the app shell so react-router can resolve the path.
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

startWatcher();

async function startAnalyticsImportWatcher() {
  await mkdir(analyticsImportsRoot, { recursive: true });
  watchImports((dir, onFile) => {
    const watcher = chokidar.watch(dir, {
      ignoreInitial: false,
      depth: 1,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    });
    watcher.on("add", onFile);
  });
}
void startAnalyticsImportWatcher();

serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 8787 }, (info) =>
  console.log(`API on http://127.0.0.1:${info.port}`)
);
