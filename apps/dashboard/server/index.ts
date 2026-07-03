import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { streamSSE } from "hono/streaming";
import { addClient, removeClient } from "./sse.js";
import { startWatcher } from "./watcher.js";
import { registerRoutes } from "./routes.js";

const app = new Hono();
registerRoutes(app);

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
}

startWatcher();
serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 8787 }, (info) =>
  console.log(`API on http://127.0.0.1:${info.port}`)
);
