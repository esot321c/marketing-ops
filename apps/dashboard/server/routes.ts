import type { Hono } from "hono";
import { spawn } from "node:child_process";
import { mkdir, writeFile, appendFile, readFile, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { listTenants, tenantExists } from "../src/lib/tenantRegistry.js";
import { readInitState, writeInitState } from "../src/lib/setupStore.js";
import { createInitState, setStageStatus, isReadyToPost } from "../src/lib/initState.js";
import { stageById } from "../src/lib/initStages.js";
import {
  resolveTenantSetupDir,
  resolveSetupAssetPath,
  resolveDesignSystemDir,
  resolveDesignPreviewPath,
  resolveStageArtifactPath,
  stageArtifactRelPath,
  resolveContentDir,
  resolveContentItemPath,
  resolveContentFile,
  resolveContentRequestPath,
  resolveContentAssetPath,
  resolveContentAssetDir,
  resolveBoardPrefsFile,
} from "../src/lib/setupPaths.js";
import { isValidTenantId } from "../src/lib/setupPaths.js";
import { readAnalytics } from "./analyticsStore.js";
import { parseItems, boardIndex, ALL_BOARD_STATES, COLUMN_COLORS, reconcileBoardPrefs, type BoardPrefs } from "../src/lib/contentLibrary.js";
import { todayView } from "../src/lib/planner.js";
import { parseLearnings, pendingFirst, decide } from "../src/lib/learnings.js";
import { detectPosture, availableModes } from "../src/lib/runModes.js";
import { runHeadless, type RunRecord } from "./headlessRunner.js";
import { contentInstruction, latestPendingRefineNote } from "../src/lib/contentHandoff.js";
import type { StageId } from "../src/lib/types.js";
import type { Cadence, AgentAction, RunMode } from "../src/lib/contentTypes.js";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;
const ASSET_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};
const CONTENT_STATES = new Set(["idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured", "needs_work", "parked"]);

async function readItems(tenant: string) {
  const dir = resolveContentDir(tenant);
  if (!dir) return [];
  const itemsDir = path.join(dir, "items");
  const names = await readdir(itemsDir).catch(() => [] as string[]);
  const raw = await Promise.all(
    names.filter((n) => n.endsWith(".json")).map((n) => readFile(path.join(itemsDir, n), "utf8").catch(() => ""))
  );
  return parseItems(raw.filter((r) => r !== ""));
}

async function readCadence(tenant: string): Promise<Cadence | null> {
  const file = resolveContentFile(tenant, "cadence.json");
  if (!file) return null;
  const raw = await readFile(file, "utf8").catch(() => null);
  if (raw === null) return null;
  try { return JSON.parse(raw) as Cadence; } catch { return null; }
}

async function readBoardPrefs(tenant: string): Promise<BoardPrefs> {
  const defaults: BoardPrefs = { columnOrder: ALL_BOARD_STATES, columnColors: {} };
  const file = resolveBoardPrefsFile(tenant);
  if (!file) return defaults;
  const raw = await readFile(file, "utf8").catch(() => null);
  if (raw === null) return defaults;
  try {
    const parsed = JSON.parse(raw) as { columnOrder?: unknown[]; columnColors?: Record<string, unknown> };
    if (!Array.isArray(parsed.columnOrder)) return defaults;
    return reconcileBoardPrefs({ columnOrder: parsed.columnOrder, columnColors: parsed.columnColors });
  } catch {
    return defaults;
  }
}

async function writeBoardPrefs(tenant: string, prefs: BoardPrefs): Promise<void> {
  const file = resolveBoardPrefsFile(tenant)!;
  await mkdir(path.dirname(file), { recursive: true });
  const tmpFile = `${file}.tmp`;
  await writeFile(tmpFile, JSON.stringify(prefs, null, 2) + "\n", "utf8");
  await rename(tmpFile, file);
}

async function tenantName(tenant: string): Promise<string> {
  const t = (await listTenants()).find((x) => x.id === tenant);
  return t?.name ?? tenant;
}

async function appendRun(tenant: string, record: RunRecord): Promise<void> {
  const file = resolveContentFile(tenant, "runs.jsonl");
  if (!file) return;
  const dir = resolveContentDir(tenant)!;
  await mkdir(dir, { recursive: true });
  await appendFile(file, JSON.stringify(record) + "\n", "utf8");
}

export function registerRoutes(app: Hono) {
  app.get("/api/tenants", async (c) => c.json(await listTenants()));

  app.get("/api/analytics/:tenant", async (c) => {
    const tenant = c.req.param("tenant");
    if (!isValidTenantId(tenant)) return c.json({ error: "Invalid tenant" }, 400);
    return c.json(await readAnalytics(tenant));
  });

  // Rendered markdown artifact a stage produced (voice.md, icp.md, etc.).
  app.get("/api/setup/:tenant/:stage/artifact", async (c) => {
    const tenant = c.req.param("tenant");
    const stage = c.req.param("stage");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    if (!stageById(stage)) return c.text("Unknown stage", 400);
    if (stage === "design-system") {
      return c.json({ kind: "design-system" as const });
    }
    const file = resolveStageArtifactPath(tenant, stage);
    if (!file) return c.json({ kind: "none" as const });
    try {
      const content = await readFile(file, "utf8");
      return c.json({ kind: "markdown" as const, path: stageArtifactRelPath(tenant, stage), content });
    } catch {
      // not produced yet
      return c.json({ kind: "empty" as const, path: stageArtifactRelPath(tenant, stage) });
    }
  });

  app.get("/api/setup/:tenant/state", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const state = (await readInitState(tenant)) ?? createInitState(tenant);
    return c.json({ state, readyToPost: isReadyToPost(state) });
  });

  app.post("/api/setup/:tenant/intake", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const body = await c.req.json<{ linkedinUrl?: string; websiteUrl?: string; notes?: string }>().catch(() => null);
    if (!body) return c.text("Invalid JSON", 400);
    const dir = resolveTenantSetupDir(tenant)!;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "intake.md"),
      `# Intake — ${tenant}\n\n- LinkedIn: ${body.linkedinUrl ?? ""}\n- Website: ${body.websiteUrl ?? ""}\n\n${body.notes ?? ""}\n`, "utf8");
    const state = (await readInitState(tenant)) ?? createInitState(tenant);
    const next = setStageStatus(state, "import-intake", "in-review");
    next.stages["import-intake"].artifactPath = `data/${tenant}/setup/intake.md`;
    await writeInitState(tenant, next);
    return c.json({ ok: true, state: next });
  });

  app.post("/api/setup/:tenant/assets", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const form = await c.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return c.text("No file", 400);
    if (!ALLOWED.has(file.type)) return c.text("Unsupported type", 415);
    if (file.size > MAX_BYTES) return c.text("Too large", 413);
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = resolveSetupAssetPath(tenant, safeName);
    if (!dest) return c.text("Bad filename", 400);
    const dir = resolveTenantSetupDir(tenant)!;
    await mkdir(path.join(dir, "assets"), { recursive: true });
    await writeFile(dest, Buffer.from(await file.arrayBuffer()));
    await appendFile(path.join(dir, "import-manifest.json"),
      JSON.stringify({ file: safeName, type: file.type, size: file.size }) + "\n", "utf8");
    return c.json({ ok: true, file: `data/${tenant}/setup/assets/${safeName}` });
  });

  app.post("/api/setup/:tenant/:stage/input", async (c) => {
    const tenant = c.req.param("tenant");
    const stage = c.req.param("stage") as StageId;
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const def = stageById(stage);
    if (!def || def.type !== "input") return c.text("Not an input stage", 400);
    const body = await c.req.json<{ content?: string }>().catch(() => null);
    if (!body) return c.text("Invalid JSON", 400);
    const dir = resolveTenantSetupDir(tenant)!;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${stage}.md`), `# ${def.label} — ${tenant}\n\n${body.content ?? ""}\n`, "utf8");
    const state = (await readInitState(tenant)) ?? createInitState(tenant);
    const next = setStageStatus(state, stage, "in-review");
    next.stages[stage].artifactPath = `data/${tenant}/setup/${stage}.md`;
    await writeInitState(tenant, next);
    return c.json({ ok: true, state: next });
  });

  app.post("/api/setup/:tenant/:stage/approve", async (c) => {
    const tenant = c.req.param("tenant");
    const stage = c.req.param("stage") as StageId;
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    if (!stageById(stage)) return c.text("Unknown stage", 400);
    const state = (await readInitState(tenant)) ?? createInitState(tenant);
    const next = setStageStatus(state, stage, "approved", new Date().toISOString());
    await writeInitState(tenant, next);
    return c.json({ ok: true, state: next, readyToPost: isReadyToPost(next) });
  });

  app.get("/api/design-system/:tenant/tokens", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const dsDir = resolveDesignSystemDir(tenant);
    if (!dsDir) return c.text("Unknown tenant", 404);
    const tokensPath = path.join(dsDir, "tokens.json");
    const contents = await readFile(tokensPath, "utf8").catch(() => null);
    if (contents === null) return c.text("No tokens", 404);
    return c.json(JSON.parse(contents) as unknown);
  });

  app.get("/api/design-system/:tenant/previews", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const dsDir = resolveDesignSystemDir(tenant);
    if (!dsDir) return c.text("Unknown tenant", 404);
    const previewsDir = path.join(dsDir, "previews");
    const entries = await readdir(previewsDir).catch(() => null);
    const previews = entries ? entries.filter((f) => f.endsWith(".html")) : [];
    return c.json({ previews });
  });

  app.get("/api/design-system/:tenant/previews/:name", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const name = c.req.param("name");
    const filePath = resolveDesignPreviewPath(tenant, name);
    if (!filePath) return c.text("Bad filename", 400);
    const contents = await readFile(filePath, "utf8").catch(() => null);
    if (contents === null) return c.text("Not found", 404);
    return c.html(contents);
  });

  app.post("/api/profiles/:tenant/:channel/state", async (c) => {
    const tenant = c.req.param("tenant");
    const channel = c.req.param("channel");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    if (channel !== "linkedin") return c.text("Unknown channel", 400);
    const body = await c.req.json<{ to?: string }>().catch(() => null);
    if (!body?.to) return c.text("Missing 'to'", 400);
    const { createProfileSpec, setProfileState } = await import("../src/lib/profileSpec.js");
    const { readInitStateFrom, writeInitStateTo } = await import("../src/lib/setupStore.js");
    const dir = resolveTenantSetupDir(tenant)!;
    const file = path.join(dir, `profile-${channel}.json`);
    const existing = await readInitStateFrom<import("../src/lib/types.js").ProfileSpec>(file);
    const spec = existing ?? createProfileSpec(tenant, "linkedin");
    try {
      const next = setProfileState(spec, body.to as never);
      await mkdir(dir, { recursive: true });
      await writeInitStateTo(file, next);
      return c.json({ ok: true, profile: next });
    } catch (e) { return c.text((e as Error).message, 409); }
  });

  app.get("/api/content/:tenant", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    return c.json(boardIndex(await readItems(tenant)));
  });

  app.get("/api/content/:tenant/today", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const cadence = (await readCadence(tenant)) ?? { tenantId: tenant, perWeek: {}, engagement: "", pillars: [], updatedBy: [] };
    const today = new Date().toISOString().slice(0, 10);
    return c.json(todayView(await readItems(tenant), cadence, today));
  });

  app.get("/api/content/:tenant/cadence", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const cadence = (await readCadence(tenant)) ?? { tenantId: tenant, perWeek: {}, engagement: "", pillars: [], updatedBy: [] };
    return c.json(cadence);
  });

  app.get("/api/content/:tenant/board-prefs", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    return c.json(await readBoardPrefs(tenant));
  });

  app.post("/api/content/:tenant/board-prefs", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const body = await c.req.json<{ columnOrder?: unknown; columnColors?: Record<string, unknown> }>().catch(() => null);
    if (!body || !Array.isArray(body.columnOrder)) return c.text("Missing or invalid columnOrder", 400);
    if (body.columnColors !== undefined) {
      if (typeof body.columnColors !== "object" || body.columnColors === null) {
        return c.text("Invalid columnColors", 400);
      }
      for (const [state, color] of Object.entries(body.columnColors)) {
        if (!(ALL_BOARD_STATES as string[]).includes(state)) return c.text("Unknown state in columnColors", 400);
        if (typeof color !== "string" || !(color in COLUMN_COLORS)) return c.text("Unknown color in columnColors", 400);
      }
    }
    const reconciled = reconcileBoardPrefs({
      columnOrder: body.columnOrder,
      columnColors: body.columnColors,
    });
    await writeBoardPrefs(tenant, reconciled);
    return c.json(reconciled);
  });

  app.get("/api/content/:tenant/run-modes", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const posture = detectPosture(process.env);
    return c.json({ modes: availableModes(posture), posture });
  });

  app.get("/api/content/:tenant/learnings", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentFile(tenant, "learnings.jsonl");
    const raw = file ? await readFile(file, "utf8").catch(() => "") : "";
    return c.json({ learnings: pendingFirst(parseLearnings(raw)) });
  });

  app.post("/api/content/:tenant/requests", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const body = await c.req.json<{ prompt?: string; channel?: string }>().catch(() => null);
    if (!body?.prompt) return c.text("Missing prompt", 400);
    const id = `req-${new Date().toISOString().replace(/[^0-9]/g, "")}`;
    const file = resolveContentRequestPath(tenant, id)!;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({
      id, tenantId: tenant, channel: body.channel ?? "linkedin",
      prompt: body.prompt, createdAt: new Date().toISOString(), status: "pending", resultIds: [],
    }), "utf8");
    return c.json({ id, instruction: contentInstruction("fulfil-request", await tenantName(tenant), id) });
  });

  app.post("/api/content/:tenant/:id/state", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentItemPath(tenant, c.req.param("id"));
    if (!file) return c.text("Bad id", 400);
    const body = await c.req.json<{ to?: string; date?: string }>().catch(() => null);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null || !body?.to) return c.text("Not found or missing 'to'", 400);
    if (!CONTENT_STATES.has(body.to)) return c.text("Bad state", 400);
    const item = JSON.parse(raw) as { state: string; schedule: { status: string; date?: string } };
    if (typeof item.schedule !== "object" || item.schedule === null) {
      item.schedule = { status: "unscheduled" };
    }
    item.state = body.to;
    if (body.to === "scheduled") item.schedule = { status: "scheduled", date: body.date };
    if (body.to === "posted") {
      item.schedule = { ...item.schedule, status: "posted", ...(body.date ? { date: body.date } : {}) };
    }
    await writeFile(file, JSON.stringify(item, null, 2), "utf8");
    return c.json({ ok: true, item });
  });

  app.post("/api/content/:tenant/:id/order", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentItemPath(tenant, c.req.param("id"));
    if (!file) return c.text("Bad id", 400);
    const body = await c.req.json<{ order?: number }>().catch(() => null);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null || body?.order === undefined || !Number.isFinite(body.order)) {
      return c.text("Not found or missing 'order'", 400);
    }
    const item = JSON.parse(raw) as { order?: number };
    item.order = body.order;
    await writeFile(file, JSON.stringify(item, null, 2), "utf8");
    return c.json({ ok: true, item });
  });

  app.post("/api/content/:tenant/:id/refine", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentItemPath(tenant, c.req.param("id"));
    if (!file) return c.text("Bad id", 400);
    const body = await c.req.json<{ instruction?: string }>().catch(() => null);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null || !body?.instruction) return c.text("Not found or missing instruction", 400);
    const item = JSON.parse(raw) as { refineLog: { at: string; instruction: string; summary: string }[] };
    item.refineLog.push({ at: new Date().toISOString(), instruction: body.instruction, summary: "pending" });
    await writeFile(file, JSON.stringify(item, null, 2), "utf8");
    return c.json({ ok: true, instruction: contentInstruction("refine", await tenantName(tenant), c.req.param("id")) });
  });

  app.post("/api/content/:tenant/learnings/:id/decision", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const body = await c.req.json<{ decision?: "accepted" | "rejected" }>().catch(() => null);
    if (body?.decision !== "accepted" && body?.decision !== "rejected") return c.text("Bad decision", 400);
    const file = resolveContentFile(tenant, "learnings.jsonl");
    if (!file) return c.text("Unknown tenant", 404);
    const raw = await readFile(file, "utf8").catch(() => "");
    const id = c.req.param("id");
    const updated = parseLearnings(raw).map((l) => l.id === id ? decide(l, body.decision!, new Date().toISOString()) : l);
    await writeFile(file, updated.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
    const instruction = body.decision === "accepted"
      ? contentInstruction("apply-learning", await tenantName(tenant), id) : null;
    return c.json({ ok: true, instruction });
  });

  app.post("/api/content/:tenant/run", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const body = await c.req.json<{ action?: AgentAction; targetId?: string; mode?: RunMode }>().catch(() => null);
    if (!body?.action || !body.mode) return c.text("Missing action or mode", 400);
    let refineNote: string | undefined;
    if (body.action === "refine" && body.targetId) {
      const itemFile = resolveContentItemPath(tenant, body.targetId);
      const raw = itemFile ? await readFile(itemFile, "utf8").catch(() => null) : null;
      if (raw) {
        try {
          const item = JSON.parse(raw) as { refineLog?: { instruction: string; summary: string }[] };
          refineNote = latestPendingRefineNote(item.refineLog ?? []);
        } catch { /* malformed item: treat as no queued note */ }
      }
    }
    const instruction = contentInstruction(body.action, await tenantName(tenant), body.targetId, refineNote);
    if (body.mode === "chat") return c.json({ mode: "chat", instruction });
    if (!availableModes(detectPosture(process.env)).includes(body.mode)) return c.text("Mode unavailable", 409);
    const result = await runHeadless(
      { tenant, action: body.action, instruction, mode: body.mode },
      { spawn: spawn as never, appendRun, env: process.env, now: () => new Date().toISOString() }
    );
    return c.json({ mode: body.mode, runId: result.runId, exitCode: result.exitCode });
  });

  app.get("/api/content/:tenant/:id/assets", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const dir = resolveContentAssetDir(tenant, c.req.param("id"));
    if (!dir) return c.text("Bad path", 400);
    const names = await readdir(dir).catch(() => [] as string[]);
    return c.json(names.sort());
  });

  app.get("/api/content/:tenant/:id/assets/:file", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentAssetPath(tenant, c.req.param("id"), c.req.param("file"));
    if (!file) return c.text("Bad path", 400);
    const type = ASSET_CONTENT_TYPES[path.extname(file).toLowerCase()];
    if (!type) return c.text("Unsupported type", 400);
    const buf = await readFile(file).catch(() => null);
    if (buf === null) return c.text("Not found", 404);
    return c.body(new Uint8Array(buf).buffer, 200, { "content-type": type });
  });

  app.post("/api/content/:tenant/:id/assets/:assetId/upload", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const form = await c.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return c.text("No file", 400);
    if (!ALLOWED.has(file.type)) return c.text("Unsupported type", 415);
    if (file.size > MAX_BYTES) return c.text("Too large", 413);
    const safe = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = resolveContentAssetPath(tenant, c.req.param("id"), safe);
    if (!dest) return c.text("Bad path", 400);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await file.arrayBuffer()));
    const rel = `data/${tenant}/content/assets/${c.req.param("id")}/${safe}`;
    return c.json({ ok: true, file: rel });
  });

  // Registered last so the literal sub-paths above (today, cadence, run-modes,
  // learnings) match before this catch-all :id route.
  app.get("/api/content/:tenant/:id", async (c) => {
    const tenant = c.req.param("tenant");
    if (!(await tenantExists(tenant))) return c.text("Unknown tenant", 404);
    const file = resolveContentItemPath(tenant, c.req.param("id"));
    if (!file) return c.text("Bad id", 400);
    const raw = await readFile(file, "utf8").catch(() => null);
    if (raw === null) return c.text("Not found", 404);
    return c.json(JSON.parse(raw) as unknown);
  });
}
