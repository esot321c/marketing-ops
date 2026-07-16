import type { Hono } from "hono";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantId, resolveWorkTypeDir, resolveWorkFile } from "../src/lib/setupPaths.js";
import { isCapabilityId, CAPABILITIES } from "../src/lib/capabilities.js";

const WORK_STATUSES = ["in_review", "approved", "archived"] as const;
type WorkStatus = (typeof WORK_STATUSES)[number];

function isWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === "string" && (WORK_STATUSES as readonly string[]).includes(value);
}

export function rewriteStatus(raw: string, status: string): string {
  const lines = raw.split("\n");
  if (lines[0] !== "---") {
    return `---\nstatus: ${status}\n---\n${raw}`;
  }
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) {
    return `---\nstatus: ${status}\n---\n${raw}`;
  }
  let replaced = false;
  for (let i = 1; i < closingIndex; i++) {
    const line = lines[i]!;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    if (key === "status") {
      lines[i] = `status: ${status}`;
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    lines.splice(closingIndex, 0, `status: ${status}`);
  }
  return lines.join("\n");
}

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
  app.get("/api/work/:tenant", async (c) => {
    const tenant = c.req.param("tenant");
    if (!isValidTenantId(tenant)) return c.json({ error: "Invalid tenant" }, 400);
    const counts: Record<string, number> = {};
    for (const cap of CAPABILITIES) {
      const dir = resolveWorkTypeDir(tenant, cap.id);
      const names = dir ? await readdir(dir).catch(() => null) : null;
      if (names === null) {
        counts[cap.id] = 0;
        continue;
      }
      const mdNames = names.filter((n) => n.endsWith(".md"));
      const statuses = await Promise.all(
        mdNames.map(async (name) => {
          const raw = await readFile(path.join(dir!, name), "utf8").catch(() => "");
          return parseFrontmatter(raw).data.status;
        })
      );
      counts[cap.id] = statuses.filter((status) => status !== "archived").length;
    }
    return c.json(counts);
  });

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

  app.post("/api/work/:tenant/:type/:slug/status", async (c) => {
    const tenant = c.req.param("tenant");
    const type = c.req.param("type");
    const slug = c.req.param("slug");
    if (!isValidTenantId(tenant)) return c.json({ error: "Invalid tenant" }, 400);
    if (!isCapabilityId(type)) return c.json({ error: "Invalid type" }, 400);
    const file = resolveWorkFile(tenant, type, slug);
    if (!file) return c.json({ error: "Invalid slug" }, 400);
    const { status } = await c.req.json<{ status?: string }>();
    if (!isWorkStatus(status)) return c.json({ error: "Invalid status" }, 400);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null) return c.json({ error: "Not found" }, 404);
    const updated = rewriteStatus(raw, status);
    await writeFile(file, updated, "utf8");
    const { data } = parseFrontmatter(updated);
    return c.json(toSummary(slug, data));
  });
}
