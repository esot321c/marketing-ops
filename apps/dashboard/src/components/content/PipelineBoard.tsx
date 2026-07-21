import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent as DndKitDragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getBoard, getBoardPrefs, postState, setBoardPrefs, setItemOrder, duplicateItem, deleteItem } from "@/lib/api";
import { useLiveData } from "@/hooks/useLiveData";
import { ALL_BOARD_STATES, COLUMN_COLORS, type BoardPrefs } from "@/lib/contentLibrary";
import {
  computeReorder, dropArgs,
  columnDragId, columnBodyDropId, resolveDragEndAction, type DragEndLike,
} from "@/lib/boardDrag";
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

function SortableCard({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", state },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, position: "relative" }} data-testid={`card-${item.id}`}>
      <button
        type="button"
        className="ws-card-btn ws-board-card"
        {...attributes}
        {...listeners}
        onClick={() => onCardClick(state, item)}
      >
        <div className="ws-ink ws-board-card-title" style={{ paddingRight: 20 }}>{item.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span className="ws-pill ws-pill-mono">{effectiveFormat(item)}</span>
          <span className="ws-slate" aria-hidden="true">&middot;</span>
          <span className="ws-pill ws-pill-mono">{channelLabel(item.channel, siteDomain)}</span>
        </div>
      </button>
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

function ColumnBody({
  state,
  items,
  children,
}: {
  state: ContentState;
  items: ContentItem[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnBodyDropId(state) });

  return (
    <div
      ref={setNodeRef}
      className="ws-board-colbody"
      style={{
        background: isOver
          ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)"
          : "color-mix(in srgb, var(--ws-band) 40%, transparent)",
        border: isOver ? "1px solid var(--ws-accent)" : "1px solid var(--ws-line)",
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

function SortableColumnHead({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnDragId(state),
    data: { type: "column" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="ws-board-colhead"
      style={style}
      {...attributes}
      {...listeners}
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

export function PipelineBoard({ tenant, siteDomain, onOpen }: { tenant: string; siteDomain?: string; onOpen: (id: string) => void }) {
  const fetch = useCallback(() => getBoard(tenant), [tenant]);
  const { data, reload } = useLiveData<Record<ContentState, ContentItem[]>>(fetch, (p) => p.includes(`/content/${tenant}/`));
  const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULT_PREFS);
  const [colorMenuFor, setColorMenuFor] = useState<ContentState | null>(null);
  const [reviewItem, setReviewItem] = useState<ContentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cardMenuFor, setCardMenuFor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  async function pickColor(state: ContentState, color: string) {
    setColorMenuFor(null);
    await persistPrefs({ ...prefs, columnColors: { ...prefs.columnColors, [state]: color } });
  }

  async function moveItemWithinColumn(target: ContentState, id: string, index: number) {
    if (!data) return;
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
  }

  async function moveItemAcrossColumns(id: string, source: ContentState, target: ContentState) {
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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DndKitDragEndEvent) {
    setActiveId(null);
    if (!data) return;
    const normalized: DragEndLike = {
      active: {
        id: String(event.active.id),
        data: { current: event.active.data.current as { type?: string; state?: ContentState } | undefined },
      },
      over: event.over ? { id: String(event.over.id) } : null,
    };
    const action = resolveDragEndAction(normalized, data, prefs.columnOrder);
    if (!action) return;

    if (action.kind === "column-reorder") {
      await persistPrefs({ ...prefs, columnOrder: action.columnOrder });
    } else if (action.kind === "same-column") {
      await moveItemWithinColumn(action.column, action.id, action.index);
    } else {
      await moveItemAcrossColumns(action.id, action.source, action.target);
    }
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

  const activeItem = useMemo(() => {
    if (!data || !activeId) return null;
    for (const state of prefs.columnOrder) {
      const found = data[state]?.find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  }, [data, activeId, prefs.columnOrder]);

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
          onDragStart={handleDragStart}
          onDragEnd={(e) => void handleDragEnd(e)}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="ws-board-scroll">
            <SortableContext items={prefs.columnOrder.map(columnDragId)} strategy={horizontalListSortingStrategy}>
              <div className="ws-board-row">
                {prefs.columnOrder.map((state) => {
                  const colorKey = prefs.columnColors?.[state] ?? "default";
                  const dotColor = COLUMN_COLORS[colorKey] ?? COLUMN_COLORS.default;
                  const items = data[state];
                  return (
                    <div key={state} className="ws-board-col">
                      <SortableColumnHead
                        state={state}
                        items={items}
                        colorMenuFor={colorMenuFor}
                        dotColor={dotColor}
                        onToggleColorMenu={(s) => setColorMenuFor((cur) => (cur === s ? null : s))}
                        onPickColor={(s, color) => void pickColor(s, color)}
                      />

                      <ColumnBody state={state} items={items}>
                        {items.map((i) => (
                          <SortableCard
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
            </SortableContext>
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="ws-card-btn ws-board-card" style={{ cursor: "grabbing" }}>
                <div className="ws-ink ws-board-card-title">{activeItem.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span className="ws-pill ws-pill-mono">{effectiveFormat(activeItem)}</span>
                  <span className="ws-slate" aria-hidden="true">&middot;</span>
                  <span className="ws-pill ws-pill-mono">{channelLabel(activeItem.channel, siteDomain)}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
