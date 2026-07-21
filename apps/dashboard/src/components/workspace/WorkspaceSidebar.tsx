import { Link } from "react-router-dom";
import { useState } from "react";
import type { StageId } from "@/lib/types";
import type { SetupStep } from "@/lib/setupNav";
import type { ReactNode } from "react";
import { CAPABILITIES } from "@/lib/capabilities";
import { readSidebarCollapsed, writeSidebarCollapsed, readGroupFolded, writeGroupFolded } from "./sidebarCollapse";

export type Section =
  | "today" | "board" | "composer" | "cadence" | "learnings"
  | "campaigns" | "strategy" | "keywords" | "research" | "analytics" | "ask"
  | StageId;

interface WorkspaceSidebarProps {
  mode: "guided" | "ready";
  tenantName: string;
  steps: SetupStep[];
  section: Section;
  hrefFor: (s: Section) => string;
  composerEnabled: boolean;
  outstanding?: Set<string>;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface ItemProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  href?: string;
  trailing?: ReactNode;
  num?: ReactNode;
}

// Enabled items render as real <Link>s (middle-clickable, open-in-new-tab, and
// they survive a refresh); disabled/locked items stay <button>s so the
// `.ws-nav-item:disabled` styling and non-navigability hold.
function Item({ label, active, disabled, href, trailing, num }: ItemProps) {
  const style = num !== undefined ? { gap: 10 } : undefined;
  const inner = (
    <>
      {num !== undefined ? (
        <span
          className="ws-mono"
          style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--ws-line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, flex: "none" }}
        >
          {num}
        </span>
      ) : null}
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {trailing}
    </>
  );

  if (href !== undefined && !disabled) {
    return (
      <Link to={href} className="ws-nav-item" aria-current={active} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className="ws-nav-item" aria-current={active} disabled={disabled} style={style}>
      {inner}
    </button>
  );
}

// A foldable nav section. The header doubles as the fold toggle; a chevron
// shows the state and the fold is remembered per section (see sidebarCollapse).
// `contains` marks the group as holding the active section so it stays open on
// load even when its default is folded (you never lose sight of where you are).
function SectionGroup({
  group,
  label,
  defaultFolded,
  contains,
  children,
}: {
  group: string;
  label: string;
  defaultFolded: boolean;
  contains: boolean;
  children: ReactNode;
}) {
  const [folded, setFolded] = useState(() =>
    contains ? false : readGroupFolded(group, defaultFolded),
  );

  function toggle() {
    const next = !folded;
    setFolded(next);
    writeGroupFolded(group, next);
  }

  return (
    <>
      <button
        type="button"
        className="ws-nav-sec ws-nav-sec-toggle"
        aria-expanded={!folded}
        onClick={toggle}
      >
        <span>{label}</span>
        <span className="ws-nav-sec-chev" aria-hidden>{folded ? "▸" : "▾"}</span>
      </button>
      {folded ? null : children}
    </>
  );
}

const CONTENT: { id: Section; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "board", label: "Pipeline board" },
  { id: "composer", label: "Composer" },
];
const TUNE: { id: Section; label: string }[] = [
  { id: "cadence", label: "Cadence" },
  { id: "learnings", label: "Learnings" },
];

export function WorkspaceSidebar({ mode, tenantName, steps, section, hrefFor, composerEnabled, outstanding, onCollapsedChange }: WorkspaceSidebarProps) {
  const guided = mode === "guided";
  const done = steps.filter((s) => s.status === "done").length;
  const [collapsed, setCollapsed] = useState(() => readSidebarCollapsed());

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    writeSidebarCollapsed(next);
    onCollapsedChange?.(next);
  }

  if (collapsed) {
    return (
      <nav className="ws-side ws-side-collapsed">
        <button type="button" className="ws-side-toggle" aria-label="Expand sidebar" onClick={toggleCollapsed}>
          {"»"}
        </button>
      </nav>
    );
  }

  const tuneHasActive = TUNE.some((c) => c.id === section);
  const workHasActive = CAPABILITIES.some((cap) => cap.id === section);
  const setupHasActive = steps.some((s) => s.stageId === section);

  return (
    <nav className="ws-side">
      <div className="ws-side-head">
        <div className="ws-side-head-row">
          <div className="ws-wordmark">{tenantName}</div>
          <button type="button" className="ws-side-toggle" aria-label="Collapse sidebar" onClick={toggleCollapsed}>
            {"«"}
          </button>
        </div>
        <div className="ws-kicker">{guided ? `Setting up · ${done} of ${steps.length}` : "Ready to post"}</div>
        {guided ? (
          <div className="pbar" style={{ height: 4, background: "var(--ws-band)", borderRadius: 2, margin: "6px 8px 0", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.round((done / steps.length) * 100)}%`, background: "var(--ws-accent)" }} />
          </div>
        ) : null}
      </div>
      <div className="ws-side-body">
      {!guided ? (
        <>
          <div className="ws-nav-sec">Content</div>
          {CONTENT.map((c) => {
            const disabled = c.id === "composer" && !composerEnabled;
            return (
              <Item key={c.id} label={c.label} active={section === c.id} disabled={disabled} href={disabled ? undefined : hrefFor(c.id)} />
            );
          })}
          <Item label="Ask" active={section === "ask"} href={hrefFor("ask")} />

          <SectionGroup group="tune" label="Tune" defaultFolded contains={tuneHasActive}>
            {TUNE.map((c) => (
              <Item key={c.id} label={c.label} active={section === c.id} href={hrefFor(c.id)} />
            ))}
          </SectionGroup>

          <SectionGroup group="work" label="Work" defaultFolded contains={workHasActive}>
            {CAPABILITIES.map((cap) => (
              <Item
                key={cap.id}
                label={cap.label}
                active={section === cap.id}
                href={hrefFor(cap.id as Section)}
                trailing={
                  outstanding?.has(cap.id)
                    ? <span className="ws-mono" style={{ fontSize: 9, color: "var(--ws-slate)" }}>to do</span>
                    : null
                }
              />
            ))}
          </SectionGroup>
        </>
      ) : null}

      {guided ? (
        <>
          <div className="ws-nav-sec">Setup</div>
          {steps.map((s, i) => (
            <Item
              key={s.stageId}
              label={s.label}
              active={section === s.stageId}
              disabled={s.status === "locked"}
              href={s.status === "locked" ? undefined : hrefFor(s.stageId)}
              num={s.status === "done" ? "✓" : i + 1}
              trailing={
                s.status === "locked"
                  ? <span className="ws-mono" style={{ fontSize: 9, color: "var(--ws-slate)" }}>locked</span>
                  : null
              }
            />
          ))}
          <div className="ws-nav-sec">Locked until ready</div>
          <Item label="Content · Tune" active={false} disabled />
          <p style={{ margin: "auto 10px 4px", fontSize: 11, color: "var(--ws-slate)", lineHeight: 1.5 }}>
            Finish setup to unlock the content dashboard. You can step back to any completed section anytime.
          </p>
        </>
      ) : (
        <SectionGroup group="setup" label="Setup" defaultFolded contains={setupHasActive}>
          {steps.map((s) => (
            <Item
              key={s.stageId}
              label={s.label}
              active={section === s.stageId}
              href={hrefFor(s.stageId)}
              trailing={
                s.status === "done"
                  ? <span style={{ color: "var(--ws-accent)", fontSize: 12 }}>✓</span>
                  : null
              }
            />
          ))}
        </SectionGroup>
      )}
      </div>
    </nav>
  );
}
