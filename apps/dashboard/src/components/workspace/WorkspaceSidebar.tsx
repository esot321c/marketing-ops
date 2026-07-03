import { Link } from "react-router-dom";
import type { StageId } from "@/lib/types";
import type { SetupStep } from "@/lib/setupNav";
import type { ReactNode } from "react";

export type Section =
  | "today" | "board" | "composer" | "cadence" | "learnings" | StageId;

interface WorkspaceSidebarProps {
  mode: "guided" | "ready";
  tenantName: string;
  steps: SetupStep[];
  section: Section;
  hrefFor: (s: Section) => string;
  composerEnabled: boolean;
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

const CONTENT: { id: Section; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "board", label: "Pipeline board" },
  { id: "composer", label: "Composer" },
];
const TUNE: { id: Section; label: string }[] = [
  { id: "cadence", label: "Cadence" },
  { id: "learnings", label: "Learnings" },
];

export function WorkspaceSidebar({ mode, tenantName, steps, section, hrefFor, composerEnabled }: WorkspaceSidebarProps) {
  const guided = mode === "guided";
  const done = steps.filter((s) => s.status === "done").length;

  return (
    <nav className="ws-side">
      <div className="ws-wordmark">{tenantName}</div>
      <div className="ws-kicker">{guided ? `Setting up · ${done} of ${steps.length}` : "Content motion"}</div>
      {guided ? (
        <div className="pbar" style={{ height: 4, background: "var(--ws-band)", borderRadius: 2, margin: "6px 10px 0", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${Math.round((done / steps.length) * 100)}%`, background: "var(--ws-accent)" }} />
        </div>
      ) : null}

      {!guided ? (
        <>
          <div className="ws-nav-sec">Content</div>
          {CONTENT.map((c) => {
            const disabled = c.id === "composer" && !composerEnabled;
            return (
              <Item key={c.id} label={c.label} active={section === c.id} disabled={disabled} href={disabled ? undefined : hrefFor(c.id)} />
            );
          })}
          <div className="ws-nav-sec">Tune</div>
          {TUNE.map((c) => (
            <Item key={c.id} label={c.label} active={section === c.id} href={hrefFor(c.id)} />
          ))}
        </>
      ) : null}

      <div className="ws-nav-sec">Setup</div>
      {steps.map((s, i) => {
        const locked = guided && s.status === "locked";
        return (
          <Item
            key={s.stageId}
            label={s.label}
            active={section === s.stageId}
            disabled={locked}
            href={locked ? undefined : hrefFor(s.stageId)}
            num={guided ? (s.status === "done" ? "✓" : i + 1) : undefined}
            trailing={
              guided
                ? s.status === "locked"
                  ? <span className="ws-mono" style={{ fontSize: 9, color: "var(--ws-slate)" }}>locked</span>
                  : null
                : s.status === "done"
                  ? <span style={{ color: "var(--ws-accent)", fontSize: 12 }}>✓</span>
                  : null
            }
          />
        );
      })}

      {guided ? (
        <>
          <div className="ws-nav-sec">Locked until ready</div>
          <Item label="Content · Tune" active={false} disabled />
          <p style={{ margin: "auto 10px 4px", fontSize: 11, color: "var(--ws-slate)", lineHeight: 1.5 }}>
            Finish setup to unlock the content dashboard. You can step back to any completed section anytime.
          </p>
        </>
      ) : null}
    </nav>
  );
}
