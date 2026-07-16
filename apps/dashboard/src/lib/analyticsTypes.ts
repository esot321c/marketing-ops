export interface DemographicEntry {
  label: string;
  pct: number | null;
}

export interface Demographics {
  jobTitles: DemographicEntry[];
  locations: DemographicEntry[];
  seniority: DemographicEntry[];
  industries: DemographicEntry[];
  companySizes: DemographicEntry[];
}

export interface AnalyticsCapture {
  capturedAt: string;
  source: "xlsx-import" | "manual";
  impressions: number | null;
  membersReached: number | null;
  inNetworkPct: number | null;
  socialEngagements: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  sends: number | null;
  linkEngagements: number | null;
  premiumButtonEngagements: number | null;
  profileViewers: number | null;
  followersGained: number | null;
  demographics?: Demographics;
}

export interface AnalyticsPost {
  id: string;
  title: string;
  postUrl?: string;
  urn?: string;
  itemId?: string;
  postedAt?: string;
  postedTime?: string;
  format?: string;
  linkPlacement?: "body" | "self-comment" | "none";
  captures: AnalyticsCapture[];
}

export interface AnalyticsData {
  posts: AnalyticsPost[];
}
