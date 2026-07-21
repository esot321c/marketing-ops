import { useCallback, useEffect, useRef, useState } from "react";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, setItemOrder, duplicateItem, deleteItem } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { ALL_BOARD_STATES, COLUMN_COLORS, type BoardPrefs } from "@/lib/contentLibrary";
import { computeReorder, insertAt, dropArgs } from "@/lib/boardDrag";
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

// Drag payload discriminators. Every draggable/drop-target carries a `dragType`
// so the single monitor can tell cards from columns without guessing.
type CardData = { dragType: "card"; id: string; state: ContentState };
type ColumnData = { dragType: "column"; state: ContentState };
type ColumnBodyData = { dragType: "column-body"; state: ContentState; isEnd?: boolean };

function isCardData(d: Record<string | symbol, unknown>): d is CardData {
  return d.dragType === "card";
}
function isColumnData(d: Record<string | symbol, unknown>): d is ColumnData {
  return d.dragType === "column";
}

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
          onPointerDown={(e) => e.stopPropagation()}
        >
          &#8943;
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-42">
        {confirmingDelete ? (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Delete?</div>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(item.id)}>
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
            <DropdownMenuItem onSelect={() => onOpen(item.id)}>Open</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {columnOrder
                  .filter((target) => target !== state)
                  .map((target) => (
                    <DropdownMenuItem key={target} onSelect={() => onMoveTo(item.id, target)}>
                      {LABELS[target]}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => onDuplicate(item.id)}>Duplicate</DropdownMenuItem>
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

function BoardCard({
  item,
  state,
  siteDomain,
  columnOrder,
  cardMenuFor,
  onCardMenuOpenChange,
  onOpen,
  onCardClick,
  onMoveTo,
  onDuplicate,
  onDelete,
}: {
  item: ContentItem;
  state: ContentState;
  siteDomain?: string;
  columnOrder: ContentState[];
  cardMenuFor: string | null;
  onCardMenuOpenChange: (id: string, open: boolean) => void;
  onOpen: (id: string) => void;
  onCardClick: (state: ContentState, item: ContentItem) => void;
  onMoveTo: (id: string, target: ContentState) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const data: CardData = { dragType: "card", id: item.id, state };
    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ ...data }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => isCardData(source.data),
        getData: ({ input, element }) =>
          attachClosestEdge({ ...data }, { element, input, allowedEdges: ["top", "bottom"] }),
        onDrag: ({ self, source }) => {
          // Do not draw an indicator under the card being dragged over itself.
          if (isCardData(source.data) && source.data.id === item.id) {
            setClosestEdge(null);
            return;
          }
          setClosestEdge(extractClosestEdge(self.data));
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [item.id, state]);

  return (
    <div ref={ref} style={{ position: "relative", opacity: dragging ? 0.4 : 1 }} data-testid={`card-${item.id}`}>
      <button
        type="button"
        className="ws-card-btn ws-board-card"
        onClick={() => onCardClick(state, item)}
      >
        <div className="ws-ink ws-board-card-title" style={{ paddingRight: 20 }}>{item.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span className="ws-pill ws-pill-mono">{effectiveFormat(item)}</span>
          <span className="ws-slate" aria-hidden="true">&middot;</span>
          <span className="ws-pill ws-pill-mono">{channelLabel(item.channel, siteDomain)}</span>
        </div>
      </button>
      {closestEdge ? <DropIndicator edge={closestEdge} gap="8px" /> : null}
      <CardMenu
        item={item}
        state={state}
        columnOrder={columnOrder}
        open={cardMenuFor === item.id}
        onOpenChange={(next) => onCardMenuOpenChange(item.id, next)}
        onOpen={onOpen}
        onMoveTo={onMoveTo}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}

function ColumnHead({
  state,
  items,
  colorMenuFor,
  dotColor,
  onToggleColorMenu,
  onPickColor,
}: {
  state: ContentState;
  items: ContentItem[];
  colorMenuFor: ContentState | null;
  dotColor: string | undefined;
  onToggleColorMenu: (state: ContentState) => void;
  onPickColor: (state: ContentState, color: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const data: ColumnData = { dragType: "column", state };
    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ ...data }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => isColumnData(source.data),
        getData: ({ input, element }) =>
          attachClosestEdge({ ...data }, { element, input, allowedEdges: ["left", "right"] }),
        onDrag: ({ self, source }) => {
          if (isColumnData(source.data) && source.data.state === state) {
            setClosestEdge(null);
            return;
          }
          setClosestEdge(extractClosestEdge(self.data));
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [state]);

  return (
    <div
      ref={ref}
      className="ws-board-colhead"
      style={{ position: "relative", opacity: dragging ? 0.5 : 1, cursor: "grab" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <button
          type="button"
          aria-label={`Color for ${LABELS[state]}`}
          className="ws-board-dot"
          style={{ background: dotColor }}
          onClick={(e) => { e.stopPropagation(); onToggleColorMenu(state); }}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <span className="ws-ink" style={{ fontSize: 12.5, fontWeight: 600 }}>{LABELS[state]}</span>
      </div>
      <span className="ws-slate ws-mono" style={{ fontSize: 11 }}>{items.length}</span>
      {closestEdge ? <DropIndicator edge={closestEdge} /> : null}

      {colorMenuFor === state ? (
        <div
          className="ws-board-swatchmenu"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {Object.keys(COLUMN_COLORS).map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              className="ws-board-dot"
              style={{ background: COLUMN_COLORS[key] }}
              onClick={() => onPickColor(state, key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ColumnBody({
  state,
  children,
}: {
  state: ContentState;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  // The whole body is a drop target (for column-level highlight and as a
  // fallback), and a dedicated end-zone that fills the space after the last
  // card is a separate drop target meaning "drop at the bottom". Dropping in a
  // column's open area lands on the end-zone unambiguously, no card-target
  // geometry to fight. This mirrors Atlassian's own board example.
  useEffect(() => {
    const bodyEl = ref.current;
    const endEl = endRef.current;
    if (!bodyEl || !endEl) return;
    const bodyData: ColumnBodyData = { dragType: "column-body", state };
    const endData: ColumnBodyData = { dragType: "column-body", state, isEnd: true };
    return combine(
      dropTargetForElements({
        element: bodyEl,
        canDrop: ({ source }) => isCardData(source.data),
        getData: () => ({ ...bodyData }),
        onDragEnter: () => setIsOver(true),
        onDrag: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: () => setIsOver(false),
      }),
      dropTargetForElements({
        element: endEl,
        canDrop: ({ source }) => isCardData(source.data),
        getData: () => ({ ...endData }),
      }),
    );
  }, [state]);

  return (
    <div
      ref={ref}
      className="ws-board-colbody"
      style={{
        background: isOver
          ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)"
          : "color-mix(in srgb, var(--ws-band) 40%, transparent)",
        border: isOver ? "1px solid var(--ws-accent)" : "1px solid var(--ws-line)",
      }}
    >
      {children}
      {/* Grows to fill the remaining column space; dropping here means "bottom". */}
      <div ref={endRef} style={{ flex: "1 1 auto", minHeight: 24 }} />
    </div>
  );
}

export function PipelineBoard({ tenant, siteDomain, onOpen }: { tenant: string; siteDomain?: string; onOpen: (id: string) => void }) {
  const fetch = useCallback(() => getBoard(tenant), [tenant]);
  const { data, reload } = useLiveData<Record<ContentState, ContentItem[]>>(fetch, (p) => p.includes(`/content/${tenant}/`));
  const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULT_PREFS);
  const [colorMenuFor, setColorMenuFor] = useState<ContentState | null>(null);
  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cardMenuFor, setCardMenuFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Live refs so the single monitor (registered once) always reads current data
  // and prefs without re-registering on every board change.
  const dataRef = useRef(data);
  const prefsRef = useRef(prefs);
  dataRef.current = data;
  prefsRef.current = prefs;

  useEffect(() => {
    let cancelled = false;
    void getBoardPrefs(tenant).then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => { cancelled = true; };
  }, [tenant]);

  const persistPrefs = useCallback(async (next: BoardPrefs) => {
    const previous = prefsRef.current;
    setPrefs(next);
    setActionError(null);
    try {
      await setBoardPrefs(tenant, next);
    } catch (e) {
      setPrefs(previous);
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }, [tenant]);

  async function pickColor(state: ContentState, color: string) {
    setColorMenuFor(null);
    await persistPrefs({ ...prefsRef.current, columnColors: { ...prefsRef.current.columnColors, [state]: color } });
  }

  const moveItemWithinColumn = useCallback(async (target: ContentState, id: string, index: number) => {
    const cur = dataRef.current;
    if (!cur) return;
    const writes = computeReorder(cur[target], id, index);
    if (writes === null) return;
    setActionError(null);
    const results = await Promise.allSettled(writes.map((w) => setItemOrder(tenant, w.id, w.order)));
    const firstRejection = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (firstRejection) {
      const reason = firstRejection.reason;
      setActionError(reason instanceof Error ? reason.message : String(reason));
    }
    reload();
  }, [tenant, reload]);

  const moveItemAcrossColumns = useCallback(async (id: string, source: ContentState, target: ContentState, index: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const args = dropArgs(source, target, today);
    if (!args) return;
    setActionError(null);
    try {
      // Change state first, then compute the order value that inserts the moved
      // item at `index` among the target column's EXISTING items. We compute the
      // writes against the target column as it looked before the move (the moved
      // item is not part of it), then also write the moved item's own order.
      await postState(tenant, id, args.to, args.date);
      const cur = dataRef.current;
      if (cur) {
        // postState may already have folded the moved item into the target
        // column (optimistic update or a refetch landing mid-flight). Exclude it
        // so `existing` is the column as it looked WITHOUT the moved item, which
        // is what insertAt's neighbour math and the caller's `index` assume.
        const existing = cur[target].filter((i) => i.id !== id);
        const at = Math.min(index, existing.length);
        const writes = insertAt(existing, id, at);
        if (writes.length) {
          await Promise.allSettled(writes.map((w) => setItemOrder(tenant, w.id, w.order)));
        }
      }
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [tenant, reload]);

  // One monitor for the whole board, registered once. Reads live data/prefs via
  // refs, resolves the drop (card reorder / cross-column / column reorder), and
  // dispatches to the existing persistence. The reorder math (getReorderDestinationIndex)
  // is the Atlassian hitbox util; the write math is our computeReorder.
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.dragType === "card" || source.data.dragType === "column",
      onDrop: ({ source, location }) => {
        const targets = location.current.dropTargets;
        if (targets.length === 0) return;
        const cur = dataRef.current;
        const curPrefs = prefsRef.current;
        if (!cur) return;

        // Column reorder
        if (isColumnData(source.data)) {
          const target = targets.find((t) => t.data.dragType === "column");
          if (!target || !isColumnData(target.data)) return;
          const from = source.data.state;
          const overState = target.data.state;
          if (from === overState) return;
          const order = curPrefs.columnOrder;
          const startIndex = order.indexOf(from);
          const indexOfTarget = order.indexOf(overState);
          if (startIndex === -1 || indexOfTarget === -1) return;
          const closestEdgeOfTarget = extractClosestEdge(target.data);
          const finishIndex = getReorderDestinationIndex({
            startIndex, indexOfTarget, closestEdgeOfTarget, axis: "horizontal",
          });
          if (finishIndex === startIndex) return;
          const next = [...order];
          next.splice(startIndex, 1);
          next.splice(finishIndex, 0, from);
          void persistPrefs({ ...curPrefs, columnOrder: next });
          return;
        }

        // Card drop
        if (!isCardData(source.data)) return;
        const sourceState = source.data.state;
        const id = source.data.id;

        // The dedicated end-zone (open area after the last card) wins first and
        // always means "drop at the bottom" of that column, with no card-target
        // geometry to fight. Otherwise use the hovered card target for precise
        // slotting, then a plain column-body fallback.
        const endTarget = targets.find(
          (t) => t.data.dragType === "column-body" && (t.data as ColumnBodyData).isEnd,
        );
        if (endTarget) {
          const targetState = (endTarget.data as ColumnBodyData).state;
          if (targetState === sourceState) {
            void moveItemWithinColumn(targetState, id, cur[targetState].length);
          } else {
            void moveItemAcrossColumns(id, sourceState, targetState, cur[targetState].length);
          }
          return;
        }

        const cardTarget = targets.find((t) => t.data.dragType === "card");
        const bodyTarget = targets.find(
          (t) => t.data.dragType === "column-body" && !(t.data as ColumnBodyData).isEnd,
        );

        if (cardTarget && isCardData(cardTarget.data)) {
          const targetState = cardTarget.data.state;
          const targetItems = cur[targetState];
          const indexOfTarget = targetItems.findIndex((i) => i.id === (cardTarget.data as CardData).id);
          const closestEdgeOfTarget = extractClosestEdge(cardTarget.data);

          // Raw pre-removal drop slot: the target card's index, plus one if
          // dropping on its bottom edge. computeReorder does its own removal
          // adjustment (see its contract), so do NOT also use
          // getReorderDestinationIndex here or the removal is subtracted twice
          // and the card lands one slot too high.
          const dropSlot = indexOfTarget + (closestEdgeOfTarget === "bottom" ? 1 : 0);

          if (sourceState === targetState) {
            void moveItemWithinColumn(targetState, id, dropSlot);
          } else {
            // Cross-column: the source is not yet in the target column, so the
            // slot is used directly (no removal adjustment needed there).
            void moveItemAcrossColumns(id, sourceState, targetState, dropSlot);
          }
          return;
        }

        if (bodyTarget && bodyTarget.data.dragType === "column-body") {
          // Dropped in a column's open area (below the cards, or an empty
          // column): send the card to the bottom, whether it is the same column
          // or a different one. No card edge or blue indicator needed.
          const targetState = (bodyTarget.data as ColumnBodyData).state;
          if (targetState === sourceState) {
            // Same column: the last slot in the pre-removal array. computeReorder
            // adjusts for the removal, so length places it at the end.
            void moveItemWithinColumn(targetState, id, cur[targetState].length);
          } else {
            void moveItemAcrossColumns(id, sourceState, targetState, cur[targetState].length);
          }
        }
      },
    });
  }, [persistPrefs, moveItemWithinColumn, moveItemAcrossColumns]);

  // Horizontal auto-scroll of the board while dragging near the edges. A callback
  // ref registers auto-scroll exactly when the scroll element mounts (it lives
  // behind the data-loaded branch), and cleans up when it unmounts, so it does
  // not depend on data and never tears down mid-session on a refetch.
  const autoScrollCleanup = useRef<(() => void) | null>(null);
  const scrollCallbackRef = useCallback((el: HTMLDivElement | null) => {
    autoScrollCleanup.current?.();
    autoScrollCleanup.current = null;
    scrollRef.current = el;
    if (el) {
      autoScrollCleanup.current = autoScrollForElements({
        element: el,
        canScroll: ({ source }) => source.data.dragType === "card" || source.data.dragType === "column",
      });
    }
  }, []);

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
        <p className="ws-slate" style={{ fontSize: 13 }}>Loading&hellip;</p>
      ) : (
        <div className="ws-board-scroll" ref={scrollCallbackRef}>
          <div className="ws-board-row">
            {prefs.columnOrder.map((state) => {
              const colorKey = prefs.columnColors?.[state] ?? "default";
              const dotColor = COLUMN_COLORS[colorKey] ?? COLUMN_COLORS.default;
              const items = data[state];
              return (
                <div key={state} className="ws-board-col">
                  <ColumnHead
                    state={state}
                    items={items}
                    colorMenuFor={colorMenuFor}
                    dotColor={dotColor}
                    onToggleColorMenu={(s) => setColorMenuFor((cur) => (cur === s ? null : s))}
                    onPickColor={(s, color) => void pickColor(s, color)}
                  />
                  <ColumnBody state={state}>
                    {items.map((i) => (
                      <BoardCard
                        key={i.id}
                        item={i}
                        state={state}
                        siteDomain={siteDomain}
                        columnOrder={prefs.columnOrder}
                        cardMenuFor={cardMenuFor}
                        onCardMenuOpenChange={(id, open) => setCardMenuFor(open ? id : null)}
                        onOpen={onOpen}
                        onCardClick={handleCardClick}
                        onMoveTo={(id, target) => void handleCardMoveTo(id, target)}
                        onDuplicate={(id) => void handleCardDuplicate(id)}
                        onDelete={(id) => void handleCardDelete(id)}
                      />
                    ))}
                  </ColumnBody>
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
