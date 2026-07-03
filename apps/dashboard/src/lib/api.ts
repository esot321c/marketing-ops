import type { InitState, TenantSummary, ProfileSpec } from "@/lib/types";
import type { DesignTokens } from "@/design-system/types";
import type { ContentItem, ContentState, RunMode, AgentAction, Learning } from "@/lib/contentTypes";
import type { Suggestion } from "@/lib/planner";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getTenants(): Promise<TenantSummary[]> {
  return jsonRequest<TenantSummary[]>("/api/tenants");
}

export async function getInitState(
  tenant: string
): Promise<{ state: InitState; readyToPost: boolean }> {
  return jsonRequest<{ state: InitState; readyToPost: boolean }>(
    `/api/setup/${encodeURIComponent(tenant)}/state`
  );
}

export async function postIntake(
  tenant: string,
  body: { linkedinUrl?: string; websiteUrl?: string; notes?: string }
): Promise<{ ok: boolean; state: InitState }> {
  return jsonRequest<{ ok: boolean; state: InitState }>(
    `/api/setup/${encodeURIComponent(tenant)}/intake`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function uploadAsset(
  tenant: string,
  file: File
): Promise<{ ok: boolean; file: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/setup/${encodeURIComponent(tenant)}/assets`, {
    method: "POST",
    body: form,
    // No content-type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<{ ok: boolean; file: string }>;
}

export async function postStageInput(
  tenant: string,
  stage: string,
  content: string
): Promise<{ ok: boolean; state: InitState }> {
  return jsonRequest<{ ok: boolean; state: InitState }>(
    `/api/setup/${encodeURIComponent(tenant)}/${encodeURIComponent(stage)}/input`,
    { method: "POST", body: JSON.stringify({ content }) }
  );
}

export async function approveStage(
  tenant: string,
  stage: string
): Promise<{ ok: boolean; state: InitState; readyToPost: boolean }> {
  return jsonRequest<{ ok: boolean; state: InitState; readyToPost: boolean }>(
    `/api/setup/${encodeURIComponent(tenant)}/${encodeURIComponent(stage)}/approve`,
    { method: "POST" }
  );
}

export async function getDesignTokens(
  tenant: string
): Promise<DesignTokens | null> {
  const res = await fetch(
    `/api/design-system/${encodeURIComponent(tenant)}/tokens`
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<DesignTokens>;
}

export async function getPreviews(tenant: string): Promise<string[]> {
  const res = await fetch(
    `/api/design-system/${encodeURIComponent(tenant)}/previews`
  );
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { previews: string[] };
  return data.previews;
}

export function designPreviewUrl(tenant: string, name: string): string {
  return `/api/design-system/${encodeURIComponent(tenant)}/previews/${encodeURIComponent(name)}`;
}

export type StageArtifact =
  | { kind: "markdown"; path: string | null; content: string }
  | { kind: "design-system" }
  | { kind: "empty"; path: string | null }
  | { kind: "none" };

export async function getStageArtifact(
  tenant: string,
  stage: string
): Promise<StageArtifact> {
  return jsonRequest<StageArtifact>(
    `/api/setup/${encodeURIComponent(tenant)}/${encodeURIComponent(stage)}/artifact`
  );
}

export async function setProfileState(
  tenant: string,
  channel: string,
  to: string
): Promise<{ ok: boolean; profile: ProfileSpec }> {
  return jsonRequest<{ ok: boolean; profile: ProfileSpec }>(
    `/api/profiles/${encodeURIComponent(tenant)}/${encodeURIComponent(channel)}/state`,
    { method: "POST", body: JSON.stringify({ to }) }
  );
}

export function getBoard(tenant: string) {
  return jsonRequest<Record<ContentState, ContentItem[]>>(`/api/content/${encodeURIComponent(tenant)}`);
}

export function getToday(tenant: string) {
  return jsonRequest<{ due: ContentItem[]; suggested: Suggestion[] }>(`/api/content/${encodeURIComponent(tenant)}/today`);
}

export function getItem(tenant: string, id: string) {
  return jsonRequest<ContentItem>(`/api/content/${encodeURIComponent(tenant)}/${encodeURIComponent(id)}`);
}

export function getRunModes(tenant: string) {
  return jsonRequest<{ modes: RunMode[]; posture: { hasOauthToken: boolean; hasApiKey: boolean; localBackend: boolean } }>(`/api/content/${encodeURIComponent(tenant)}/run-modes`);
}

export function getLearnings(tenant: string) {
  return jsonRequest<{ learnings: Learning[] }>(`/api/content/${encodeURIComponent(tenant)}/learnings`);
}

export function postRequest(tenant: string, prompt: string, channel: string) {
  return jsonRequest<{ id: string; instruction: string }>(`/api/content/${encodeURIComponent(tenant)}/requests`, { method: "POST", body: JSON.stringify({ prompt, channel }) });
}

export function postState(tenant: string, id: string, to: ContentState, date?: string) {
  return jsonRequest<{ ok: boolean; item: ContentItem }>(`/api/content/${encodeURIComponent(tenant)}/${encodeURIComponent(id)}/state`, { method: "POST", body: JSON.stringify({ to, date }) });
}

export function postRefine(tenant: string, id: string, instruction: string) {
  return jsonRequest<{ ok: boolean; instruction: string }>(`/api/content/${encodeURIComponent(tenant)}/${encodeURIComponent(id)}/refine`, { method: "POST", body: JSON.stringify({ instruction }) });
}

export function postLearningDecision(tenant: string, id: string, decision: "accepted" | "rejected") {
  return jsonRequest<{ ok: boolean; instruction: string | null }>(`/api/content/${encodeURIComponent(tenant)}/learnings/${encodeURIComponent(id)}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
}

export function postRun(tenant: string, action: AgentAction, mode: RunMode, targetId?: string) {
  return jsonRequest<{ mode: RunMode; instruction?: string; runId?: string; exitCode?: number }>(`/api/content/${encodeURIComponent(tenant)}/run`, { method: "POST", body: JSON.stringify({ action, mode, targetId }) });
}
