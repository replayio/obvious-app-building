"use client";

import { useRef, useState } from "react";
import type { Page, ViewType } from "@/types";
import { VIEW_TYPES } from "@/types";

interface PageHeaderProps {
  page: Page;
  onRename: (id: string, title: string) => void;
  onChangeViewType: (pageId: string, viewType: ViewType) => void;
}

/** Keyed by page.id in parent — local state resets on page change. */
export function PageHeader({
  page,
  onRename,
  onChangeViewType,
}: PageHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitTitle() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.title) {
      onRename(page.id, trimmed);
    } else {
      setDraft(page.title);
    }
    setEditing(false);
  }

  return (
    <div className="space-y-3 border-b px-6 py-4">
      {/* Editable title */}
      {editing ? (
        <input
          ref={inputRef}
          className="w-full bg-transparent text-xl font-semibold outline-none ring-1 ring-ring rounded px-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setDraft(page.title);
              setEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <h1
          className="cursor-text text-xl font-semibold hover:text-foreground/80"
          onClick={() => {
            setEditing(true);
            setTimeout(() => inputRef.current?.select(), 0);
          }}
        >
          {page.title}
        </h1>
      )}

      {/* View type selector */}
      <div className="flex gap-1">
        {VIEW_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChangeViewType(page.id, value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              page.viewType === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}


