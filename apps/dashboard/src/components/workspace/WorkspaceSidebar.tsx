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
  onSelect: (s: Section) => void;
  composerEnabled: boolean;
}

interface ItemProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  num?: ReactNode;
}

function Item({ label, active, disabled, onClick, trailing, num }: ItemProps) {
  return (
    <button
      type="button"
      className="ws-nav-item"
      aria-current={active}
      disabled={disabled}
      onClick={onClick}
      style={num !== undefined ? { gap: 10 } : undefined}
    >
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

export function WorkspaceSidebar({ mode, tenantName, steps, section, onSelect, composerEnabled }: WorkspaceSidebarProps) {
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
          {CONTENT.map((c) => (
            <Item key={c.id} label={c.label} active={section === c.id} disabled={c.id === "composer" && !composerEnabled} onClick={() => onSelect(c.id)} />
          ))}
          <div className="ws-nav-sec">Tune</div>
          {TUNE.map((c) => (
            <Item key={c.id} label={c.label} active={section === c.id} onClick={() => onSelect(c.id)} />
          ))}
        </>
      ) : null}

      <div className="ws-nav-sec">Setup</div>
      {steps.map((s, i) => (
        <Item
          key={s.stageId}
          label={s.label}
          active={section === s.stageId}
          disabled={guided && s.status === "locked"}
          onClick={guided && s.status === "locked" ? undefined : () => onSelect(s.stageId)}
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
      ))}

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
