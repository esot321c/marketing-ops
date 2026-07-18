export type Channel = "linkedin" | "blog" | "tiktok" | "instagram" | "x";
export type Format = "text-post" | "blog-post" | "carousel" | "image-post" | "short-video";
export type ContentState =
  | "idea" | "drafting" | "in_review" | "approved" | "scheduled" | "posted" | "measured"
  | "needs_work" | "parked";

export type AssetKind = "copy" | "blog-body" | "carousel-visual" | "image" | "video";
export type AssetRoute = "local-harness" | "external-tool";
export type ExternalTool = "claude-design" | "nano-banana" | "chatgpt" | "video-tool";
export type AssetStatus = "needed" | "generating" | "ready";

export interface CopyContent { kicker?: string; headline: string; body: string; closer?: string; }
export interface CarouselSlideContent {
  heading: string;
  body?: string;       // short prose lead-in, one or two sentences
  bullets?: string[];  // point-form list rendered after body
  visual?: string;     // one-line art direction for the slide image
  dark?: boolean;
}
export type AssetContent =
  | { type: "copy"; copy: CopyContent }
  | { type: "slides"; slides: CarouselSlideContent[] }
  | { type: "markdown"; markdown: string };

export interface SlidePrompt { slide: number; prompt: string; } // slide is 1-based
export interface ImagePackage {
  kind: "image";
  prompt: string; // deck-level shared style summary
  notes?: string;
  comparableRef?: string;
  treatment?: "infographic" | "text-on-art";
  slidePrompts?: SlidePrompt[];
}
export interface VideoPackage { kind: "video"; storyboard: string[]; shotPrompts: { heading: string; prompt: string }[]; }
export type GenerationPackage = ImagePackage | VideoPackage;

export interface Asset {
  id: string;
  kind: AssetKind;
  route: AssetRoute;
  tool?: ExternalTool;
  content?: AssetContent;
  package?: GenerationPackage;
  status: AssetStatus;
  resultRef?: string;
}

export interface Schedule { date?: string; status: "unscheduled" | "scheduled" | "posted"; }
export interface RefineEntry { at: string; instruction: string; summary: string; }

export interface Citation { label: string; url: string; }

export interface ContentItem {
  id: string;
  tenantId: string;
  channel: Channel;
  format: Format;
  state: ContentState;
  title: string;
  angle: string;
  pillar: string;
  caption?: string; // the LinkedIn post body that accompanies the media; one per post
  citations?: Citation[];
  assets: Asset[];
  schedule: Schedule;
  source: string[];
  refineLog: RefineEntry[];
}

export interface ContentRequest {
  id: string;
  tenantId: string;
  channel: Channel;
  prompt: string;
  createdAt: string;
  status: "pending" | "fulfilled";
  resultIds: string[];
}

export interface CadencePillar { name: string; weight: number; }
export interface CadenceUpdate { at: string; learningId: string; summary: string; }
export interface Cadence {
  tenantId: string;
  perWeek: Record<string, number>;
  engagement: string;
  pillars: CadencePillar[];
  updatedBy: CadenceUpdate[];
}

export type LearningSource = "performance" | "refine" | "user-fact" | "engagement";
export type LearningTarget = "cadence" | "voice" | "icp" | "vertical" | "competitor-research" | "profile";
export type LearningGate = "auto" | "gated";
export type LearningStatus = "auto-applied" | "pending" | "accepted" | "rejected";
export interface Learning {
  id: string;
  at: string;
  source: LearningSource;
  observation: string;
  target: LearningTarget;
  gate: LearningGate;
  proposedChange: string;
  status: LearningStatus;
  decidedAt?: string;
  resultRef?: string;
}

export type RunMode = "chat" | "headless-subscription" | "headless-apikey";
export type AgentAction = "fulfil-request" | "draft-suggestion" | "refine" | "apply-learning";

const STATES: ReadonlySet<string> = new Set<ContentState>([
  "idea", "drafting", "in_review", "approved", "scheduled", "posted", "measured",
  "needs_work", "parked",
]);

const CHANNELS: ReadonlySet<string> = new Set<Channel>([
  "linkedin", "blog", "tiktok", "instagram", "x",
]);

const FORMATS: ReadonlySet<string> = new Set<Format>([
  "text-post", "blog-post", "carousel", "image-post", "short-video",
]);

const SCHEDULE_STATUSES: ReadonlySet<string> = new Set([
  "unscheduled", "scheduled", "posted",
]);

const ASSET_KINDS: ReadonlySet<string> = new Set<AssetKind>([
  "copy", "blog-body", "carousel-visual", "image", "video",
]);

const ASSET_ROUTES: ReadonlySet<string> = new Set<AssetRoute>([
  "local-harness", "external-tool",
]);

const ASSET_STATUSES: ReadonlySet<string> = new Set<AssetStatus>([
  "needed", "generating", "ready",
]);

const TREATMENTS: ReadonlySet<string> = new Set(["infographic", "text-on-art"]);

function isValidSlide(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.heading !== "string") return false;
  if (!(s.body === undefined || typeof s.body === "string")) return false;
  if (!(s.visual === undefined || typeof s.visual === "string")) return false;
  if (!(s.dark === undefined || typeof s.dark === "boolean")) return false;
  if (s.bullets !== undefined) {
    if (!Array.isArray(s.bullets)) return false;
    if (!s.bullets.every((b) => typeof b === "string" && b.length > 0)) return false;
  }
  return true;
}

function isValidSlidePrompts(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const p = entry as Record<string, unknown>;
    return typeof p.slide === "number" && Number.isInteger(p.slide) && p.slide >= 1 &&
      typeof p.prompt === "string";
  });
}

export function gateFor(target: LearningTarget): LearningGate {
  return target === "cadence" ? "auto" : "gated";
}

export function isItemReady(item: ContentItem): boolean {
  return item.assets.length > 0 && item.assets.every((a) => a.status === "ready");
}

export function effectiveFormat(item: ContentItem): Format {
  if (item.format === "short-video" || item.assets.some((a) => a.kind === "video")) {
    return "short-video";
  }
  if (item.format === "carousel" || item.assets.some((a) => a.kind === "carousel-visual")) {
    return "carousel";
  }
  if (item.format === "image-post" || item.assets.some((a) => a.kind === "image")) {
    return "image-post";
  }
  return item.format;
}

export function validateContentItem(value: unknown): value is ContentItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  if (!(
    typeof v.id === "string" &&
    typeof v.tenantId === "string" &&
    typeof v.title === "string" &&
    typeof v.state === "string" && STATES.has(v.state) &&
    typeof v.channel === "string" && CHANNELS.has(v.channel) &&
    typeof v.format === "string" && FORMATS.has(v.format) &&
    typeof v.angle === "string" &&
    typeof v.pillar === "string" &&
    Array.isArray(v.assets) &&
    typeof v.schedule === "object" && v.schedule !== null &&
    Array.isArray(v.source) &&
    Array.isArray(v.refineLog)
  )) {
    return false;
  }

  if (!(v.caption === undefined || typeof v.caption === "string")) {
    return false;
  }

  if (v.citations !== undefined) {
    if (!Array.isArray(v.citations)) return false;
    for (const cite of v.citations) {
      if (!(typeof cite === "object" && cite !== null)) return false;
      const c = cite as Record<string, unknown>;
      if (!(typeof c.label === "string" && typeof c.url === "string")) return false;
    }
  }

  const schedule = v.schedule as Record<string, unknown>;
  if (!(typeof schedule.status === "string" && SCHEDULE_STATUSES.has(schedule.status))) {
    return false;
  }

  const assets = v.assets as unknown[];
  for (const asset of assets) {
    if (!(typeof asset === "object" && asset !== null)) return false;
    const a = asset as Record<string, unknown>;
    if (!(
      typeof a.id === "string" &&
      typeof a.kind === "string" && ASSET_KINDS.has(a.kind) &&
      typeof a.route === "string" && ASSET_ROUTES.has(a.route) &&
      typeof a.status === "string" && ASSET_STATUSES.has(a.status)
    )) {
      return false;
    }
    if (a.content !== undefined) {
      if (typeof a.content !== "object" || a.content === null) return false;
      const content = a.content as Record<string, unknown>;
      if (content.type === "slides") {
        if (!Array.isArray(content.slides)) return false;
        if (!(content.slides as unknown[]).every(isValidSlide)) return false;
      }
    }
    if (a.package !== undefined && typeof a.package === "object" && a.package !== null) {
      const pkg = a.package as Record<string, unknown>;
      if (pkg.kind === "image") {
        if (!(pkg.treatment === undefined ||
          (typeof pkg.treatment === "string" && TREATMENTS.has(pkg.treatment)))) return false;
        if (!isValidSlidePrompts(pkg.slidePrompts)) return false;
      }
    }
  }

  return true;
}
