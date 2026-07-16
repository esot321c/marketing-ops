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
import type { TooltipContentProps } from "recharts";
import { getAnalytics, getBoard } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsData, AnalyticsPost } from "@/lib/analyticsTypes";
import type { ContentItem, ContentState } from "@/lib/contentTypes";
import {
  postTableRows,
  impressionSeries,
  funnelData,
  formatComparison,
  audiencePanel,
  truncateTitle,
  formatTooltipTimestamp,
  type PostTableRow,
} from "./analyticsAggregation";

const LINE_COLORS = ["var(--ws-accent)", "var(--ws-ink)", "var(--ws-slate)", "#8884d8", "#82ca9d", "#ffc658"];

function fmt(value: number | null): string {
  return value === null ? "-" : value.toLocaleString();
}

function titleResolver(itemTitles: Map<string, string>) {
  return (post: AnalyticsPost): string => {
    if (post.itemId) {
      const linked = itemTitles.get(post.itemId);
      if (linked) return linked;
    }
    return post.title;
  };
}

type SortKey = keyof Omit<PostTableRow, "id" | "title" | "postedAt" | "format" | "linkPlacement" | "channel">;

function ChartTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload || payload.length === 0) return null;
  const formattedLabel = typeof label === "string" ? formatTooltipTimestamp(label) : label;
  return (
    <div
      style={{
        background: "var(--ws-raised)",
        border: "1px solid var(--ws-line)",
        borderRadius: 8,
        padding: "8px 10px",
        boxShadow: "var(--ws-shadow)",
        fontSize: 12.5,
        color: "var(--ws-ink)",
      }}
    >
      {formattedLabel ? (
        <div className="ws-mono" style={{ fontSize: 10.5, color: "var(--ws-slate)", marginBottom: 4 }}>
          {formattedLabel}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.color ?? "var(--ws-accent)",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--ws-ink)" }}>
              {truncateTitle(String(entry.name ?? entry.dataKey ?? ""))}:
            </span>
            <span style={{ color: "var(--ws-ink)", fontWeight: 600 }}>
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const titleTdStyle: React.CSSProperties = {
    ...tdStyle,
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
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
          <th style={thStyle}>Channel</th>
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
            <td style={titleTdStyle} title={row.title}>{row.title}</td>
            <td style={tdStyle}>{row.postedAt ?? "-"}</td>
            <td style={tdStyle}>{row.format ?? "-"}</td>
            <td style={tdStyle}>{row.linkPlacement ?? "-"}</td>
            <td style={tdStyle}>{row.channel ? <Badge variant="secondary">{row.channel}</Badge> : "-"}</td>
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

  const [itemTitles, setItemTitles] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    void getBoard(tenant)
      .then((board: Record<ContentState, ContentItem[]>) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const items of Object.values(board)) {
          for (const item of items) map.set(item.id, item.title);
        }
        setItemTitles(map);
      })
      .catch(() => {
        /* fall back to stored titles when the content board can't be loaded */
      });
    return () => {
      cancelled = true;
    };
  }, [tenant]);

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

  const resolveTitle = titleResolver(itemTitles);
  const rows = postTableRows(data.posts, resolveTitle);
  const series = impressionSeries(data.posts, resolveTitle);
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
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            {series.map((s, i) => (
              <Line
                key={s.postId}
                data={s.points}
                dataKey="impressions"
                name={truncateTitle(s.title)}
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
            <Tooltip content={<ChartTooltip />} />
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
              <Tooltip content={<ChartTooltip />} />
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
