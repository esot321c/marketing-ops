import { useCallback, useEffect, useState } from "react";
import type { DragEvent } from "react";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, setItemOrder, duplicateItem, deleteItem } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { ALL_BOARD_STATES, COLUMN_COLORS, type BoardPrefs } from "@/lib/contentLibrary";
import { computeReorder, dropArgs, reorderList } from "@/lib/boardDrag";
import type { ContentItem, ContentState } from "@/lib/contentTypes";
import { channelLabel, effectiveFormat } from "@/lib/contentTypes";
import { IdeaReviewPopup } from "./IdeaReviewPopup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LABELS: Record<ContentState, string> = {
  idea: "Ideas",
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  measured: "Measured",
  needs_work: "Needs work",
  parked: "Parked",
};

const DEFAULT_PREFS: BoardPrefs = { columnOrder: ALL_BOARD_STATES, columnColors: {} };

function CardMenu({
  item,
  state,
  columnOrder,
  open,
  onOpenChange,
  onOpen,
  onMoveTo,
  onDuplicate,
  onDelete,
}: {
  item: ContentItem;
  state: ContentState;
  columnOrder: ContentState[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (id: string) => void;
  onMoveTo: (id: string, target: ContentState) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmingDelete(false);
        onOpenChange(next);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Card actions"
          className="ws-board-card-menutrigger"
          onClick={(e) => e.stopPropagation()}
        >
          ⋯
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-42">
        {confirmingDelete ? (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Delete?</div>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(item.id)}
            >
              Confirm
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setConfirmingDelete(false);
              }}
            >
              Cancel
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={() => onOpen(item.id)}>
              Open
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {columnOrder
                  .filter((target) => target !== state)
                  .map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onSelect={() => onMoveTo(item.id, target)}
                    >
                      {LABELS[target]}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => onDuplicate(item.id)}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmingDelete(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PipelineBoard({ tenant, onOpen }: { tenant: string; onOpen: (id: string) => void }) {
  const fetch = useCallback(() => getBoard(tenant), [tenant]);
  const { data, reload } = useLiveData<Record<ContentState, ContentItem[]>>(fetch, (p) => p.includes(`/content/${tenant}/`));
  const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULT_PREFS);
  const [dragOverColumn, setDragOverColumn] = useState<ContentState | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ state: ContentState; index: number } | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<ContentState | null>(null);
  const [colorMenuFor, setColorMenuFor] = useState<ContentState | null>(null);
  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cardMenuFor, setCardMenuFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBoardPrefs(tenant).then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => { cancelled = true; };
  }, [tenant]);

  async function persistPrefs(next: BoardPrefs) {
    const previous = prefs;
    setPrefs(next);
    setActionError(null);
    try {
      await setBoardPrefs(tenant, next);
    } catch (e) {
      setPrefs(previous);
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleColumnDrop(target: ContentState) {
    setDragOverColumn(null);
    const source = draggingColumn;
    setDraggingColumn(null);
    if (!source || source === target) return;
    const from = prefs.columnOrder.indexOf(source);
    const to = prefs.columnOrder.indexOf(target);
    if (from === -1 || to === -1) return;
    await persistPrefs({ ...prefs, columnOrder: reorderList(prefs.columnOrder, from, to) });
  }

  async function pickColor(state: ContentState, color: string) {
    setColorMenuFor(null);
    await persistPrefs({ ...prefs, columnColors: { ...prefs.columnColors, [state]: color } });
  }

  async function handleItemDrop(target: ContentState, index: number, e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverItem(null);
    const id = e.dataTransfer.getData("application/x-item-id");
    const source = e.dataTransfer.getData("application/x-item-state") as ContentState;
    if (!id || !source || !data) return;

    if (source === target) {
      // data[target] is already in displayed order (orderedColumn); index is
      // the drop-slot position in that same pre-removal array. Ordinarily
      // computeReorder returns a single write for the moved item, but the
      // first-touch all-unranked column returns one write per item (a
      // one-time normalization), so every write in the list is applied.
      const writes = computeReorder(data[target], id, index);
      if (writes === null) return;
      setActionError(null);
      const results = await Promise.allSettled(writes.map((w) => setItemOrder(tenant, w.id, w.order)));
      const firstRejection = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      if (firstRejection) {
        const reason = firstRejection.reason;
        setActionError(reason instanceof Error ? reason.message : String(reason));
      }
      reload();
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const args = dropArgs(source, target, today);
    if (!args) return;
    setActionError(null);
    try {
      await postState(tenant, id, args.to, args.date);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleColumnBodyDrop(target: ContentState, e: DragEvent<HTMLDivElement>) {
    // A drop on the column body (not on a specific card) lands after the last item.
    const count = data ? data[target].length : 0;
    await handleItemDrop(target, count, e);
  }

  function handleCardClick(state: ContentState, item: ContentItem) {
    if (state === "idea") {
      setReviewItem(item);
      return;
    }
    onOpen(item.id);
  }

  async function handleMoveToDrafting(id: string) {
    setActionError(null);
    try {
      await postState(tenant, id, "drafting");
      setReviewItem(null);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCardMoveTo(id: string, target: ContentState) {
    setActionError(null);
    try {
      await postState(tenant, id, target);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCardDuplicate(id: string) {
    setActionError(null);
    try {
      await duplicateItem(tenant, id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleCardDelete(id: string) {
    setActionError(null);
    try {
      await deleteItem(tenant, id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="ws-board-page" style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
      <header style={{ flex: "0 0 auto" }}>
        <h1 className="ws-h1">Pipeline board</h1>
        <p className="ws-sub">Every piece, grouped by where it is in the lifecycle. Drag a card to move it.</p>
        {actionError && !reviewItem ? (
          <p style={{ fontSize: 11.5, margin: "8px 0 0", lineHeight: 1.5, color: "#e5484d" }}>
            Action failed: {actionError}
          </p>
        ) : null}
      </header>

      {!data ? (
        <p className="ws-slate" style={{ fontSize: 13 }}>Loading…</p>
      ) : (
        <div className="ws-board-scroll">
          <div className="ws-board-row">
            {prefs.columnOrder.map((state) => {
              const colorKey = prefs.columnColors?.[state] ?? "default";
              const dotColor = COLUMN_COLORS[colorKey] ?? COLUMN_COLORS.default;
              const items = data[state];
              return (
                <div key={state} className="ws-board-col">
                  <div
                    className="ws-board-colhead"
                    draggable
                    onDragStart={(e) => {
                      setDraggingColumn(state);
                      e.dataTransfer.setData("application/x-column-state", state);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDraggingColumn(null)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverColumn(state); }}
                    onDragLeave={() => setDragOverColumn((s) => (s === state ? null : s))}
                    onDrop={(e) => { e.preventDefault(); void handleColumnDrop(state); }}
                    style={{
                      background: dragOverColumn === state && draggingColumn && draggingColumn !== state
                        ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)"
                        : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <button
                        type="button"
                        aria-label={`Color for ${LABELS[state]}`}
                        className="ws-board-dot"
                        style={{ background: dotColor }}
                        onClick={() => setColorMenuFor((s) => (s === state ? null : state))}
                      />
                      <span className="ws-ink" style={{ fontSize: 12.5, fontWeight: 600 }}>{LABELS[state]}</span>
                    </div>
                    <span className="ws-slate ws-mono" style={{ fontSize: 11 }}>{items.length}</span>

                    {colorMenuFor === state ? (
                      <div className="ws-board-swatchmenu" onClick={(e) => e.stopPropagation()}>
                        {Object.keys(COLUMN_COLORS).map((key) => (
                          <button
                            key={key}
                            type="button"
                            aria-label={key}
                            className="ws-board-dot"
                            style={{ background: COLUMN_COLORS[key] }}
                            onClick={() => void pickColor(state, key)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="ws-board-colbody"
                    onDragOver={(e) => { e.preventDefault(); setDragOverColumn(state); }}
                    onDragLeave={() => setDragOverColumn((s) => (s === state ? null : s))}
                    onDrop={(e) => void handleColumnBodyDrop(state, e)}
                    style={{
                      background: dragOverColumn === state && !draggingColumn
                        ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)"
                        : "color-mix(in srgb, var(--ws-band) 40%, transparent)",
                      border: dragOverColumn === state && !draggingColumn ? "1px solid var(--ws-accent)" : "1px solid var(--ws-line)",
                    }}
                  >
                    {items.map((i, index) => (
                      <div key={i.id}>
                        <div
                          className="ws-board-dropslot"
                          data-testid={`dropslot-${state}-${index}`}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverItem({ state, index }); }}
                          onDrop={(e) => { e.stopPropagation(); void handleItemDrop(state, index, e); }}
                          style={{ height: dragOverItem?.state === state && dragOverItem.index === index ? 8 : 0 }}
                        />
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="ws-card-btn ws-board-card"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("application/x-item-id", i.id);
                              e.dataTransfer.setData("application/x-item-state", state);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => { setDragOverColumn(null); setDragOverItem(null); }}
                            onClick={() => handleCardClick(state, i)}
                          >
                            <div className="ws-ink ws-board-card-title" style={{ paddingRight: 20 }}>{i.title}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                              <span className="ws-pill ws-pill-mono">{effectiveFormat(i)}</span>
                              <span className="ws-slate" aria-hidden="true">&middot;</span>
                              <span className="ws-pill ws-pill-mono">{channelLabel(i.channel)}</span>
                            </div>
                          </button>
                          <CardMenu
                            item={i}
                            state={state}
                            columnOrder={prefs.columnOrder}
                            open={cardMenuFor === i.id}
                            onOpenChange={(next) => setCardMenuFor(next ? i.id : null)}
                            onOpen={onOpen}
                            onMoveTo={(id, target) => void handleCardMoveTo(id, target)}
                            onDuplicate={(id) => void handleCardDuplicate(id)}
                            onDelete={(id) => void handleCardDelete(id)}
                          />
                        </div>
                      </div>
                    ))}
                    <div
                      className="ws-board-dropslot"
                      data-testid={`dropslot-${state}-${items.length}`}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverItem({ state, index: items.length }); }}
                      onDrop={(e) => { e.stopPropagation(); void handleItemDrop(state, items.length, e); }}
                      style={{ height: dragOverItem?.state === state && dragOverItem.index === items.length ? 8 : 4 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reviewItem ? (
        <IdeaReviewPopup
          item={reviewItem}
          onMoveToDrafting={(id) => void handleMoveToDrafting(id)}
          onOpenComposer={(id) => { setReviewItem(null); onOpen(id); }}
          onClose={() => setReviewItem(null)}
          actionError={actionError}
        />
      ) : null}
    </div>
  );
}
