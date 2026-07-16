import type { AnalyticsCapture, AnalyticsPost, DemographicEntry } from "@/lib/analyticsTypes";

export type FunnelMetric =
  | "impressions"
  | "membersReached"
  | "socialEngagements"
  | "profileViewers"
  | "followersGained";

export const FUNNEL_METRICS: { key: FunnelMetric; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "membersReached", label: "Members reached" },
  { key: "socialEngagements", label: "Social engagements" },
  { key: "profileViewers", label: "Profile viewers" },
  { key: "followersGained", label: "Followers gained" },
];

export interface PostTableRow {
  id: string;
  title: string;
  postedAt?: string;
  format?: string;
  linkPlacement?: string;
  impressions: number | null;
  membersReached: number | null;
  socialEngagements: number | null;
  profileViewers: number | null;
  followersGained: number | null;
  linkEngagements: number | null;
}

export interface ImpressionSeriesPoint {
  capturedAt: string;
  impressions: number | null;
}

export interface ImpressionSeries {
  postId: string;
  title: string;
  points: ImpressionSeriesPoint[];
}

export interface FunnelDatum {
  metric: string;
  value: number;
}

export interface FormatComparisonDatum {
  format: string;
  medianImpressions: number;
  medianSocialEngagements: number;
}

export interface AudienceEntry {
  label: string;
  avgPct: number;
}

function latestCapture(post: AnalyticsPost): AnalyticsCapture | null {
  if (post.captures.length === 0) return null;
  return post.captures.reduce((latest, capture) =>
    capture.capturedAt > latest.capturedAt ? capture : latest,
  );
}

export function postTableRows(posts: AnalyticsPost[]): PostTableRow[] {
  return posts.map((post) => {
    const latest = latestCapture(post);
    return {
      id: post.id,
      title: post.title,
      postedAt: post.postedAt,
      format: post.format,
      linkPlacement: post.linkPlacement,
      impressions: latest?.impressions ?? null,
      membersReached: latest?.membersReached ?? null,
      socialEngagements: latest?.socialEngagements ?? null,
      profileViewers: latest?.profileViewers ?? null,
      followersGained: latest?.followersGained ?? null,
      linkEngagements: latest?.linkEngagements ?? null,
    };
  });
}

export function impressionSeries(posts: AnalyticsPost[]): ImpressionSeries[] {
  return posts.map((post) => ({
    postId: post.id,
    title: post.title,
    points: [...post.captures]
      .sort((a, b) => (a.capturedAt < b.capturedAt ? -1 : a.capturedAt > b.capturedAt ? 1 : 0))
      .map((c) => ({ capturedAt: c.capturedAt, impressions: c.impressions })),
  }));
}

export function funnelData(posts: AnalyticsPost[]): FunnelDatum[] {
  const latestCaptures = posts.map(latestCapture).filter((c): c is AnalyticsCapture => c !== null);
  return FUNNEL_METRICS.map(({ key, label }) => ({
    metric: label,
    value: latestCaptures.reduce((sum, c) => sum + (c[key] ?? 0), 0),
  }));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function formatComparison(posts: AnalyticsPost[]): FormatComparisonDatum[] {
  const byFormat = new Map<string, AnalyticsCapture[]>();
  for (const post of posts) {
    const format = post.format;
    if (!format) continue;
    const latest = latestCapture(post);
    if (!latest) continue;
    const list = byFormat.get(format) ?? [];
    list.push(latest);
    byFormat.set(format, list);
  }
  if (byFormat.size <= 1) return [];
  return [...byFormat.entries()].map(([format, captures]) => ({
    format,
    medianImpressions: median(
      captures.map((c) => c.impressions).filter((v): v is number => v !== null),
    ),
    medianSocialEngagements: median(
      captures.map((c) => c.socialEngagements).filter((v): v is number => v !== null),
    ),
  }));
}

function averageDemographic(
  posts: AnalyticsPost[],
  field: "seniority" | "jobTitles" | "industries",
): AudienceEntry[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const post of posts) {
    const withDemographics = [...post.captures]
      .filter((c) => c.demographics)
      .sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : a.capturedAt > b.capturedAt ? -1 : 0));
    const latest = withDemographics[0];
    if (!latest?.demographics) continue;
    for (const entry of latest.demographics[field] as DemographicEntry[]) {
      if (entry.pct === null) continue;
      const cur = totals.get(entry.label) ?? { sum: 0, count: 0 };
      cur.sum += entry.pct;
      cur.count += 1;
      totals.set(entry.label, cur);
    }
  }
  return [...totals.entries()]
    .map(([label, { sum, count }]) => ({ label, avgPct: sum / count }))
    .sort((a, b) => b.avgPct - a.avgPct);
}

export function audiencePanel(posts: AnalyticsPost[]): {
  seniority: AudienceEntry[];
  jobTitles: AudienceEntry[];
  industries: AudienceEntry[];
} {
  return {
    seniority: averageDemographic(posts, "seniority"),
    jobTitles: averageDemographic(posts, "jobTitles"),
    industries: averageDemographic(posts, "industries"),
  };
}
