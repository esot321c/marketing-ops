import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: Number(process.env.DASHBOARD_WEB_PORT) || 8788,
    allowedHosts: process.env.DASHBOARD_ALLOWED_HOST
      ? [process.env.DASHBOARD_ALLOWED_HOST]
      : undefined,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/events": { target: "http://127.0.0.1:8787", ws: false }
    }
  },
  test: { environment: "node", globals: true }
});
