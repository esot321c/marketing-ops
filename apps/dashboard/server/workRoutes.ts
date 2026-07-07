import type { Hono } from "hono";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { isValidTenantId, resolveWorkTypeDir, resolveWorkFile } from "../src/lib/setupPaths.js";
import { isCapabilityId } from "../src/lib/capabilities.js";

export function parseFrontmatter(md: string): { data: Record<string, string>; body: string } {
  const lines = md.split("\n");
  if (lines[0] !== "---") return { data: {}, body: md };
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) return { data: {}, body: md };
  const data: Record<string, string> = {};
  for (const line of lines.slice(1, closingIndex)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    data[key] = value;
  }
  let body = lines.slice(closingIndex + 1).join("\n");
  if (body.startsWith("\n")) body = body.slice(1);
  return { data, body };
}

interface WorkSummary {
  slug: string;
  title: string;
  created: string;
  status: string;
}

function toSummary(slug: string, data: Record<string, string>): WorkSummary {
  return {
    slug,
    title: data.title ?? slug,
    created: data.created ?? "",
    status: data.status ?? "",
  };
}

export function registerWorkRoutes(app: Hono) {
  app.get("/api/work/:tenant/:type", async (c) => {
    const tenant = c.req.param("tenant");
    const type = c.req.param("type");
    if (!isValidTenantId(tenant)) return c.json({ error: "Invalid tenant" }, 400);
    if (!isCapabilityId(type)) return c.json({ error: "Invalid type" }, 400);
    const dir = resolveWorkTypeDir(tenant, type);
    if (!dir) return c.json({ error: "Invalid type" }, 400);
    const names = await readdir(dir).catch(() => null);
    if (names === null) return c.json([]);
    const mdNames = names.filter((n) => n.endsWith(".md"));
    const entries = await Promise.all(
      mdNames.map(async (name) => {
        const slug = name.slice(0, -3);
        const raw = await readFile(path.join(dir, name), "utf8").catch(() => "");
        const { data } = parseFrontmatter(raw);
        return toSummary(slug, data);
      })
    );
    entries.sort((a, b) => {
      if (a.created !== b.created) return a.created < b.created ? 1 : -1;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
    return c.json(entries);
  });

  app.get("/api/work/:tenant/:type/:slug", async (c) => {
    const tenant = c.req.param("tenant");
    const type = c.req.param("type");
    const slug = c.req.param("slug");
    if (!isValidTenantId(tenant)) return c.json({ error: "Invalid tenant" }, 400);
    if (!isCapabilityId(type)) return c.json({ error: "Invalid type" }, 400);
    const file = resolveWorkFile(tenant, type, slug);
    if (!file) return c.json({ error: "Invalid slug" }, 400);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null) return c.json({ error: "Not found" }, 404);
    const { data, body } = parseFrontmatter(raw);
    return c.json({ ...toSummary(slug, data), body });
  });
}
