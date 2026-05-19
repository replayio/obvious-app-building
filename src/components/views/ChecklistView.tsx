"use client";

import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nanoid } from "nanoid";
import { GripVertical, Plus, X } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChecklistItem, Page } from "@/types";

// --- SortableItem ---

interface SortableItemProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onEnterKey: (id: string) => void;
  onBackspaceEmpty: (id: string) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

function SortableItem({
  item,
  onToggle,
  onTextChange,
  onDelete,
  onEnterKey,
  onBackspaceEmpty,
  inputRef,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/50",
        isDragging && "opacity-50",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item.id)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
        aria-label={`Toggle: ${item.text}`}
      />

      {/* Text */}
      <Input
        ref={inputRef}
        value={item.text}
        placeholder="List item…"
        onChange={(e) => onTextChange(item.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnterKey(item.id);
          } else if (e.key === "Backspace" && item.text === "") {
            e.preventDefault();
            onBackspaceEmpty(item.id);
          }
        }}
        className={cn(
          "h-7 flex-1 border-none bg-transparent px-1 shadow-none focus-visible:ring-0",
          item.checked && "text-muted-foreground line-through",
        )}
      />

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="Delete item"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// --- Progress bar ---

function ProgressIndicator({ items }: { items: ChecklistItem[] }) {
  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {done}/{total} completed
      </span>
    </div>
  );
}

// --- ChecklistView ---

interface ChecklistViewProps {
  page: Page;
}

export function ChecklistView({ page }: ChecklistViewProps) {
  const { updatePageContent } = useAppState();

  // Derive checklist items from page content (coerce if needed)
  const items: ChecklistItem[] =
    page.content.type === "checklist" ? page.content.items : [];

  // Local state mirrors the store to allow instant UI feedback
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(items);
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  /** Commit local items to the store (auto-save). */
  const save = useCallback(
    (next: ChecklistItem[]) => {
      updatePageContent(page.id, { type: "checklist", items: next });
    },
    [page.id, updatePageContent],
  );

  const applyUpdate = useCallback(
    (next: ChecklistItem[]) => {
      setLocalItems(next);
      save(next);
    },
    [save],
  );

  // --- Item operations ---

  const addItemAfter = useCallback(
    (afterId: string | null) => {
      const newItem: ChecklistItem = { id: nanoid(), text: "", checked: false };
      // Compute next outside the updater so side effects can run in the same scope
      const next =
        afterId === null
          ? [...localItems, newItem]
          : (() => {
              const idx = localItems.findIndex((i) => i.id === afterId);
              const copy = [...localItems];
              copy.splice(idx + 1, 0, newItem);
              return copy;
            })();
      applyUpdate(next);
      requestAnimationFrame(() => {
        inputRefs.current.get(newItem.id)?.focus();
      });
    },
    [localItems, applyUpdate],
  );

  const deleteItem = useCallback(
    (id: string) => {
      // Compute next outside the updater so save() and focus rAF run in the same scope
      const idx = localItems.findIndex((i) => i.id === id);
      const next = localItems.filter((i) => i.id !== id);
      applyUpdate(next);
      const focusTarget = next[Math.max(0, idx - 1)];
      if (focusTarget) {
        requestAnimationFrame(() => {
          inputRefs.current.get(focusTarget.id)?.focus();
        });
      }
    },
    [localItems, applyUpdate],
  );

  const toggleItem = useCallback(
    (id: string) => {
      applyUpdate(
        localItems.map((i) =>
          i.id === id ? { ...i, checked: !i.checked } : i,
        ),
      );
    },
    [localItems, applyUpdate],
  );

  const changeText = useCallback(
    (id: string, text: string) => {
      applyUpdate(
        localItems.map((i) => (i.id === id ? { ...i, text } : i)),
      );
    },
    [localItems, applyUpdate],
  );

  // --- Drag-and-drop ---

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = localItems.findIndex((i) => i.id === active.id);
      const newIdx = localItems.findIndex((i) => i.id === over.id);
      applyUpdate(arrayMove(localItems, oldIdx, newIdx));
    },
    [localItems, applyUpdate],
  );

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {/* Progress */}
      {localItems.length > 0 && <ProgressIndicator items={localItems} />}

      {/* Items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localItems.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {localItems.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onTextChange={changeText}
                onDelete={deleteItem}
                onEnterKey={addItemAfter}
                onBackspaceEmpty={deleteItem}
                inputRef={(el) => inputRefs.current.set(item.id, el)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-1.5 text-muted-foreground"
        onClick={() => addItemAfter(localItems.at(-1)?.id ?? null)}
      >
        <Plus className="h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}

