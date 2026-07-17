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
import { watchTenantImports } from "./analyticsImport.js";
import { dataRoot, listTenantDirs, resolveAnalyticsImportsDir } from "../src/lib/setupPaths.js";

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

// Each tenant has its own analytics/imports dir (data/<tenant>/analytics/imports),
// so there is no single shared root to watch at boot. We watch each known
// tenant's imports dir directly, and separately watch data/ (one level deep,
// directories only) so a tenant created after boot gets its own imports
// watcher registered without a restart.
const watchedTenants = new Set<string>();

function watchTenant(tenant: string): void {
  if (watchedTenants.has(tenant)) return;
  const importsDir = resolveAnalyticsImportsDir(tenant);
  if (!importsDir) return;
  watchedTenants.add(tenant);
  void mkdir(importsDir, { recursive: true }).then(() => {
    watchTenantImports(tenant, (dir, onFile) => {
      const watcher = chokidar.watch(dir, {
        ignoreInitial: false,
        depth: 1,
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      });
      watcher.on("add", onFile);
    });
  });
}

async function startAnalyticsImportWatchers() {
  for (const tenant of listTenantDirs()) watchTenant(tenant);

  // Re-scan for new tenants when a top-level tenant dir, or its setup/
  // subdirectory, appears under data/. depth: 1 (rather than 0) is needed
  // because a tenant is only discoverable once its setup/ subdir exists, and
  // that subdir can be created in the same recursive mkdir as the tenant
  // dir itself, racing a depth-0 addDir event on the tenant dir alone.
  const tenantDiscoveryWatcher = chokidar.watch(dataRoot, {
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  tenantDiscoveryWatcher.on("addDir", (dirPath: string) => {
    if (dirPath === dataRoot) return;
    for (const tenant of listTenantDirs()) watchTenant(tenant);
  });
}
void startAnalyticsImportWatchers();

serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 8787 }, (info) =>
  console.log(`API on http://127.0.0.1:${info.port}`)
);
