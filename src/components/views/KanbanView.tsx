"use client";

import { useState, useRef, useLayoutEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nanoid } from "nanoid";
import { GripVertical, GripHorizontal, Plus, X, Check } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { KanbanColumn, KanbanCard, KanbanContent } from "@/types";

// ---------------------------------------------------------------------------
// Drag-item ID helpers — we encode type+id into a single string so DndContext
// can distinguish column drags from card drags.
// ---------------------------------------------------------------------------

const COLUMN_PREFIX = "col:";
const CARD_PREFIX = "card:";

function colId(id: string) {
  return `${COLUMN_PREFIX}${id}`;
}
function cardId(id: string) {
  return `${CARD_PREFIX}${id}`;
}
function isColId(id: string) {
  return id.startsWith(COLUMN_PREFIX);
}
function isCardId(id: string) {
  return id.startsWith(CARD_PREFIX);
}
function stripPrefix(id: string) {
  return id.replace(/^(col:|card:)/, "");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CardItemProps {
  card: KanbanCard;
  isDragOverlay?: boolean;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, text: string) => void;
}

function CardItem({ card, isDragOverlay = false, onDelete, onEdit }: CardItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cardId(card.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== card.text) {
      onEdit(card.id, trimmed);
    } else {
      setDraft(card.text);
    }
    setEditing(false);
  }

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-14 rounded-md border border-dashed border-border bg-muted/30"
      />
    );
  }

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`group relative rounded-md border bg-card p-2.5 text-sm shadow-sm ${
        isDragOverlay ? "rotate-1 shadow-lg opacity-95" : "hover:border-primary/40"
      }`}
    >
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={draft}
            autoFocus
            className="h-7 flex-1 text-xs"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setDraft(card.text);
                setEditing(false);
              }
            }}
          />
          <Button size="icon-xs" variant="ghost" onClick={commitEdit}>
            <Check className="size-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-1">
          {/* drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Drag card"
          >
            <GripVertical className="size-3.5" />
          </button>
          <span
            className="flex-1 cursor-pointer leading-relaxed break-words"
            onClick={() => {
              setEditing(true);
              setTimeout(() => inputRef.current?.select(), 0);
            }}
          >
            {card.text}
          </span>
          <Button
            size="icon-xs"
            variant="ghost"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(card.id)}
            aria-label="Delete card"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ColumnProps {
  column: KanbanColumn;
  isDragOverlay?: boolean;
  onRename: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onEditCard: (columnId: string, cardId: string, text: string) => void;
}

function Column({
  column,
  isDragOverlay = false,
  onRename,
  onDeleteColumn,
  onAddCard,
  onDeleteCard,
  onEditCard,
}: ColumnProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: colId(column.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed);
    } else {
      setDraft(column.name);
    }
    setEditing(false);
  }

  const cardIds = column.cards.map((c) => cardId(c.id));

  if (isDragging && !isDragOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-64 shrink-0 rounded-xl border border-dashed border-border bg-muted/20"
      />
    );
  }

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-3 ${
        isDragOverlay ? "rotate-1 shadow-xl opacity-95" : ""
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag column"
        >
          <GripHorizontal className="size-3.5" />
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              ref={nameInputRef}
              value={draft}
              autoFocus
              className="h-7 flex-1 text-xs font-semibold"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(column.name);
                  setEditing(false);
                }
              }}
            />
            <Button size="icon-xs" variant="ghost" onClick={commitRename}>
              <Check className="size-3" />
            </Button>
          </div>
        ) : (
          <button
            className="flex-1 cursor-pointer truncate text-left text-sm font-semibold hover:text-foreground/80"
            onClick={() => {
              setEditing(true);
              setTimeout(() => nameInputRef.current?.select(), 0);
            }}
          >
            {column.name}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {column.cards.length}
            </span>
          </button>
        )}

        <Button
          size="icon-xs"
          variant="ghost"
          className="shrink-0"
          onClick={() => onDeleteColumn(column.id)}
          aria-label="Delete column"
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* Cards */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={(cId) => onDeleteCard(column.id, cId)}
              onEdit={(cId, text) => onEditCard(column.id, cId, text)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add card button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={() => onAddCard(column.id)}
      >
        <Plus className="size-3.5" />
        Add card
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanView — main component
// ---------------------------------------------------------------------------

export function KanbanView() {
  const { activePage, updatePageContent } = useAppState();

  // Drag state — track what is currently being dragged
  const [activeId, setActiveId] = useState<string | null>(null);
  // Always-current ref so drag handlers don't close over a stale columns snapshot
  const columnsRef = useRef<KanbanColumn[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a 5px move before drag starts so clicks still work
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Extract columns before guard so hooks run unconditionally (rules-of-hooks)
  const columns =
    activePage?.content.type === "kanban"
      ? (activePage.content as KanbanContent).columns
      : [];

  // Keep the ref current so drag handlers always read fresh state
  useLayoutEffect(() => {
    columnsRef.current = columns;
  });

  // Guard: only render when the active page has kanban content
  if (!activePage || activePage.content.type !== "kanban") {
    return null;
  }

  const pageId = activePage.id;

  // --- State mutation helpers ---

  function saveColumns(next: KanbanColumn[]) {
    updatePageContent(pageId, { type: "kanban", columns: next });
  }

  function addColumn() {
    const col: KanbanColumn = {
      id: nanoid(),
      name: "New Column",
      cards: [],
    };
    saveColumns([...columns, col]);
  }

  function renameColumn(columnId: string, name: string) {
    saveColumns(columns.map((c) => (c.id === columnId ? { ...c, name } : c)));
  }

  function deleteColumn(columnId: string) {
    saveColumns(columns.filter((c) => c.id !== columnId));
  }

  function addCard(columnId: string) {
    const card: KanbanCard = { id: nanoid(), text: "New card" };
    saveColumns(
      columns.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, card] } : c,
      ),
    );
  }

  function deleteCard(columnId: string, cId: string) {
    saveColumns(
      columns.map((c) =>
        c.id === columnId
          ? { ...c, cards: c.cards.filter((card) => card.id !== cId) }
          : c,
      ),
    );
  }

  function editCard(columnId: string, cId: string, text: string) {
    saveColumns(
      columns.map((c) =>
        c.id === columnId
          ? {
              ...c,
              cards: c.cards.map((card) =>
                card.id === cId ? { ...card, text } : card,
              ),
            }
          : c,
      ),
    );
  }

  // --- Drag helpers ---

  /** Find which column contains a card (by raw card id). */
  function findColumnOfCard(rawCardId: string): KanbanColumn | undefined {
    return columns.find((c) => c.cards.some((card) => card.id === rawCardId));
  }

  // Derive the item being dragged for the overlay
  const activeColumn =
    activeId && isColId(activeId)
      ? columns.find((c) => c.id === stripPrefix(activeId))
      : null;

  const activeCard =
    activeId && isCardId(activeId)
      ? (() => {
          const rawId = stripPrefix(activeId);
          const col = findColumnOfCard(rawId);
          return col?.cards.find((c) => c.id === rawId) ?? null;
        })()
      : null;

  const activeCardColumnId =
    activeId && isCardId(activeId)
      ? findColumnOfCard(stripPrefix(activeId))?.id ?? null
      : null;

  // --- Drag event handlers ---

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeStr = active.id as string;
    const overStr = over.id as string;

    // Only handle card-over-column or card-over-card (cross-column)
    if (!isCardId(activeStr)) return;

    // Read fresh state — avoids stale-closure corruption on rapid fires
    const currentColumns = columnsRef.current;
    const activeRawCard = stripPrefix(activeStr);
    const sourceCol = currentColumns.find((c) =>
      c.cards.some((card) => card.id === activeRawCard),
    );
    if (!sourceCol) return;

    let targetColId: string;
    if (isColId(overStr)) {
      targetColId = stripPrefix(overStr);
    } else if (isCardId(overStr)) {
      const overRawCard = stripPrefix(overStr);
      const targetCol = currentColumns.find((c) =>
        c.cards.some((card) => card.id === overRawCard),
      );
      if (!targetCol) return;
      targetColId = targetCol.id;
    } else {
      return;
    }

    if (sourceCol.id === targetColId) return;

    // Move the card to the target column
    const card = sourceCol.cards.find((c) => c.id === activeRawCard);
    if (!card) return;
    saveColumns(
      currentColumns.map((c) => {
        if (c.id === sourceCol.id)
          return { ...c, cards: c.cards.filter((cd) => cd.id !== activeRawCard) };
        if (c.id === targetColId) return { ...c, cards: [...c.cards, card] };
        return c;
      }),
    );
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const activeStr = active.id as string;
    const overStr = over.id as string;

    // Card dropped directly on a column container — onDragOver already moved it.
    if (isCardId(activeStr) && isColId(overStr)) return;

    const currentColumns = columnsRef.current;

    // Column reorder
    if (isColId(activeStr) && isColId(overStr)) {
      const from = currentColumns.findIndex((c) => c.id === stripPrefix(activeStr));
      const to = currentColumns.findIndex((c) => c.id === stripPrefix(overStr));
      if (from !== to) saveColumns(arrayMove(currentColumns, from, to));
      return;
    }

    // Card reorder within same column
    if (isCardId(activeStr) && isCardId(overStr)) {
      const activeRaw = stripPrefix(activeStr);
      const overRaw = stripPrefix(overStr);
      const col = currentColumns.find((c) =>
        c.cards.some((card) => card.id === activeRaw),
      );
      if (!col) return;
      const from = col.cards.findIndex((c) => c.id === activeRaw);
      const to = col.cards.findIndex((c) => c.id === overRaw);
      if (from !== to) {
        saveColumns(
          currentColumns.map((c) =>
            c.id === col.id ? { ...c, cards: arrayMove(c.cards, from, to) } : c,
          ),
        );
      }
    }
  }

  const columnIds = columns.map((c) => colId(c.id));

  // --- Empty state ---

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-sm">No columns yet. Add one to get started.</p>
        <Button variant="outline" onClick={addColumn}>
          <Plus className="size-4" />
          Add column
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        {/* Board — horizontally scrollable */}
        <ScrollArea className="flex-1">
          <div className="flex h-full gap-3 p-1 pb-3">
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  onRename={renameColumn}
                  onDeleteColumn={deleteColumn}
                  onAddCard={addCard}
                  onDeleteCard={deleteCard}
                  onEditCard={editCard}
                />
              ))}
            </SortableContext>

            {/* Add column button */}
            <Button
              variant="outline"
              className="h-fit shrink-0 self-start"
              onClick={addColumn}
            >
              <Plus className="size-4" />
              Add column
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Drag overlay — renders the ghost card or column */}
      <DragOverlay>
        {activeColumn && (
          <Column
            column={activeColumn}
            isDragOverlay
            onRename={() => {}}
            onDeleteColumn={() => {}}
            onAddCard={() => {}}
            onDeleteCard={() => {}}
            onEditCard={() => {}}
          />
        )}
        {activeCard && activeCardColumnId && (
          <CardItem
            card={activeCard}
            isDragOverlay
            onDelete={() => {}}
            onEdit={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
