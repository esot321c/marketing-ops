import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getAnalytics } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import type { AnalyticsData } from "@/lib/analyticsTypes";
import {
  postTableRows,
  impressionSeries,
  funnelData,
  formatComparison,
  audiencePanel,
  type PostTableRow,
} from "./analyticsAggregation";

const LINE_COLORS = ["var(--ws-accent)", "var(--ws-ink)", "var(--ws-slate)", "#8884d8", "#82ca9d", "#ffc658"];

function fmt(value: number | null): string {
  return value === null ? "-" : value.toLocaleString();
}

type SortKey = keyof Omit<PostTableRow, "id" | "title" | "postedAt" | "format" | "linkPlacement">;

function useHasSize(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setHasSize(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, hasSize];
}

function ChartFrame({ height, children }: { height: number; children: React.ReactNode }) {
  const [ref, hasSize] = useHasSize();
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {hasSize ? (
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

function PostTable({ rows }: { rows: PostTableRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("impressions");
  const [sortDesc, setSortDesc] = useState(true);

  const columns: { key: SortKey; label: string }[] = [
    { key: "impressions", label: "Impressions" },
    { key: "membersReached", label: "Members reached" },
    { key: "socialEngagements", label: "Social engagements" },
    { key: "profileViewers", label: "Profile viewers" },
    { key: "followersGained", label: "Followers gained" },
    { key: "linkEngagements", label: "Link engagements" },
  ];

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity;
    const bv = b[sortKey] ?? -Infinity;
    return sortDesc ? bv - av : av - bv;
  });

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontFamily: "var(--ws-mono)",
    fontSize: 10.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--ws-slate)",
    borderBottom: "1px solid var(--ws-line)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--ws-line)",
    fontSize: 13,
    whiteSpace: "nowrap",
  };

  return (
    <table
      data-testid="analytics-post-table"
      style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
    >
      <thead>
        <tr>
          <th style={thStyle}>Title</th>
          <th style={thStyle}>Posted</th>
          <th style={thStyle}>Format</th>
          <th style={thStyle}>Link placement</th>
          {columns.map((col) => (
            <th key={col.key} style={thStyle} onClick={() => onSort(col.key)}>
              {col.label}
              {sortKey === col.key ? (sortDesc ? " ↓" : " ↑") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.id}>
            <td style={tdStyle}>{row.title}</td>
            <td style={tdStyle}>{row.postedAt ?? "-"}</td>
            <td style={tdStyle}>{row.format ?? "-"}</td>
            <td style={tdStyle}>{row.linkPlacement ?? "-"}</td>
            {columns.map((col) => (
              <td key={col.key} style={tdStyle}>
                {fmt(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AudienceList({ title, entries }: { title: string; entries: { label: string; avgPct: number }[] }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.avgPct), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
      <div className="ws-label">{title}</div>
      {entries.slice(0, 8).map((entry) => (
        <div key={entry.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span>{entry.label}</span>
            <span className="ws-slate">{entry.avgPct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--ws-line)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(entry.avgPct / max) * 100}%`,
                background: "var(--ws-accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsCharts({ tenant }: { tenant: string }) {
  const fetchAnalytics = useCallback(() => getAnalytics(tenant), [tenant]);
  const shouldRefetch = useCallback((p: string) => p.includes(`/analytics/${tenant}`), [tenant]);
  const { data } = useLiveData<AnalyticsData>(fetchAnalytics, shouldRefetch);

  if (data === null) return null;

  if (data.posts.length === 0) {
    return (
      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="ws-label">Analytics</div>
        <p style={{ fontSize: 13, margin: 0 }}>
          No analytics captured yet. Drop LinkedIn post exports into{" "}
          <code className="ws-mono">{`data/analytics/imports/${tenant}/`}</code> to populate the charts.
        </p>
      </div>
    );
  }

  const rows = postTableRows(data.posts);
  const series = impressionSeries(data.posts);
  const funnel = funnelData(data.posts);
  const byFormat = formatComparison(data.posts);
  const audience = audiencePanel(data.posts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="ws-label">Impressions over time</div>
        <ChartFrame height={260}>
          <LineChart>
            <CartesianGrid stroke="var(--ws-line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="capturedAt"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {series.map((s, i) => (
              <Line
                key={s.postId}
                data={s.points}
                dataKey="impressions"
                name={s.title}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                dot
                connectNulls
              />
            ))}
          </LineChart>
        </ChartFrame>
      </div>

      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowX: "auto" }}>
        <div className="ws-label">Posts</div>
        <PostTable rows={rows} />
      </div>

      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }} data-testid="analytics-funnel">
        <div className="ws-label">Funnel</div>
        <ChartFrame height={220}>
          <BarChart data={funnel} layout="vertical">
            <CartesianGrid stroke="var(--ws-line)" strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="metric" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--ws-accent)" />
          </BarChart>
        </ChartFrame>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {funnel.map((f) => (
            <div key={f.metric} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span className="ws-slate">{f.metric}</span>
              <span>{f.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {byFormat.length > 0 ? (
        <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ws-label">Format comparison</div>
          <ChartFrame height={220}>
            <BarChart data={byFormat}>
              <CartesianGrid stroke="var(--ws-line)" strokeDasharray="3 3" />
              <XAxis dataKey="format" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="medianImpressions" name="Median impressions" fill="var(--ws-accent)" />
              <Bar dataKey="medianSocialEngagements" name="Median social engagements" fill="var(--ws-slate)" />
            </BarChart>
          </ChartFrame>
        </div>
      ) : null}

      <div className="ws-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="ws-label">Audience</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <AudienceList title="Seniority" entries={audience.seniority} />
          <AudienceList title="Job titles" entries={audience.jobTitles} />
          <AudienceList title="Industries" entries={audience.industries} />
        </div>
        {audience.seniority.length === 0 && audience.jobTitles.length === 0 && audience.industries.length === 0 ? (
          <p className="ws-slate" style={{ fontSize: 12, margin: 0 }}>No demographic data captured yet.</p>
        ) : null}
      </div>
    </div>
  );
}
