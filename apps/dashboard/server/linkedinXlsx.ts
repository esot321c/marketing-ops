import ExcelJS from "exceljs";
import type { AnalyticsCapture, Demographics, DemographicEntry } from "../src/lib/analyticsTypes.js";

export interface ParsedPostAnalytics {
  postUrl: string | null;
  urn: string | null;
  postedAt: string | null;
  postedTime: string | null;
  capture: Omit<AnalyticsCapture, "capturedAt" | "source">;
  titleSlug: string | null;
}

const URN_PATTERN = /(ugcPost|activity)-(\d+)/;

const NUMERIC_LABELS: Record<string, keyof Omit<AnalyticsCapture, "capturedAt" | "source" | "demographics">> = {
  "Impressions": "impressions",
  "Members reached": "membersReached",
  "Profile viewers from this post": "profileViewers",
  "Followers gained from this post": "followersGained",
  "Social engagements": "socialEngagements",
  "Reactions": "reactions",
  "Comments": "comments",
  "Reposts": "reposts",
  "Saves": "saves",
  "Sends on LinkedIn": "sends",
  "Link engagements": "linkEngagements",
  "Premium custom button engagements": "premiumButtonEngagements",
};

const DEMOGRAPHIC_KEYS: Record<string, keyof Demographics> = {
  "Job title": "jobTitles",
  "Location": "locations",
  "Seniority": "seniority",
  "Industry": "industries",
  "Company size": "companySizes",
};

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "text" in (value as Record<string, unknown>)) {
    return String((value as { text: unknown }).text);
  }
  if (typeof value === "object" && "result" in (value as Record<string, unknown>)) {
    return String((value as { result: unknown }).result);
  }
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function parsePercent(raw: string | null): number | null {
  if (raw === null) return null;
  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

function parseNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toIsoDate(raw: string | null): string | null {
  if (raw === null) return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return raw;
  const [, m, d, y] = match;
  return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
}

function parseUrn(url: string | null): string | null {
  if (url === null) return null;
  const match = url.match(URN_PATTERN);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

function parseTitleSlug(url: string | null): string | null {
  if (url === null) return null;
  const match = url.match(/([^/]+)-(ugcPost|activity)-\d+/);
  if (!match) return null;
  const segment = match[1]!;
  const parts = segment.split("_");
  const slugPart = parts.length > 1 ? parts[1] : parts[0];
  if (!slugPart) return null;
  return slugPart.replace(/-/g, " ");
}

export async function parseSinglePostWorkbook(buffer: Buffer): Promise<ParsedPostAnalytics> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];

  const values: Record<string, string | null> = {};
  let demographics: Demographics | undefined;
  let inDemographicsSection = false;

  sheet?.eachRow((row) => {
    const label = cellText(row.getCell(1).value);
    if (label === null) return;

    if (label === "Category") {
      inDemographicsSection = true;
      return;
    }

    if (inDemographicsSection) {
      const key = DEMOGRAPHIC_KEYS[label];
      if (key) {
        demographics ??= { jobTitles: [], locations: [], seniority: [], industries: [], companySizes: [] };
        const entry: DemographicEntry = {
          label: cellText(row.getCell(2).value) ?? "",
          pct: parsePercent(cellText(row.getCell(3).value)),
        };
        demographics[key] = [...demographics[key], entry];
      }
      return;
    }

    values[label] = cellText(row.getCell(2).value);
  });

  const postUrl = values["Post URL"] ?? null;
  if (postUrl === null) {
    throw new Error("unrecognized workbook layout");
  }

  const capture: Omit<AnalyticsCapture, "capturedAt" | "source"> = {
    impressions: null,
    membersReached: null,
    inNetworkPct: null,
    socialEngagements: null,
    reactions: null,
    comments: null,
    reposts: null,
    saves: null,
    sends: null,
    linkEngagements: null,
    premiumButtonEngagements: null,
    profileViewers: null,
    followersGained: null,
    ...(demographics ? { demographics } : {}),
  };

  for (const [label, field] of Object.entries(NUMERIC_LABELS)) {
    if (label in values) {
      capture[field] = parseNumber(values[label]!);
    }
  }

  return {
    postUrl,
    urn: parseUrn(postUrl),
    postedAt: toIsoDate(values["Post Date"] ?? null),
    postedTime: values["Post Publish Time"] ?? null,
    capture,
    titleSlug: parseTitleSlug(postUrl),
  };
}
