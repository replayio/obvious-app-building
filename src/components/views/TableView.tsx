"use client";

import { useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TableContent, TableColumn, TableRow, Page } from "@/types";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type SortDir = "asc" | "desc";
type SortState = { colId: string; dir: SortDir } | null;
type EditTarget = { kind: "header"; colId: string } | null;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function SortIcon({ sort, colId }: { sort: SortState; colId: string }) {
  if (sort?.colId !== colId) return <ChevronsUpDown className="size-3 opacity-40" />;
  return sort.dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
}

// ---------------------------------------------------------------------------
// Inner component — always receives valid table content
// ---------------------------------------------------------------------------

interface TableEditorProps {
  page: Page & { content: TableContent };
  updateContent: (next: TableContent) => void;
}

function TableEditor({ page, updateContent }: TableEditorProps) {
  const { columns, rows } = page.content;

  const [sort, setSort] = useState<SortState>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [draft, setDraft] = useState("");

  // Keyed by "rowId-colId" for Tab navigation
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  // Set to true before clearing editTarget on Escape so onBlur knows to discard
  const cancelEditRef = useRef(false);

  // ---- Sorted rows (UI-only, never persisted) ---------------------------
  const sortedRows: TableRow[] = sort
    ? [...rows].sort((a, b) => {
        const av = (a.cells[sort.colId] ?? "").toLowerCase();
        const bv = (b.cells[sort.colId] ?? "").toLowerCase();
        const cmp = av.localeCompare(bv);
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : rows;

  // ---- Mutations -------------------------------------------------------

  const addColumn = useCallback(() => {
    const col: TableColumn = { id: nanoid(), name: `Column ${columns.length + 1}` };
    updateContent({
      type: "table",
      columns: [...columns, col],
      rows: rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: "" } })),
    });
  }, [columns, rows, updateContent]);

  const deleteColumn = useCallback(
    (colId: string) => {
      if (sort?.colId === colId) setSort(null);
      updateContent({
        type: "table",
        columns: columns.filter((c) => c.id !== colId),
        rows: rows.map((r) => {
          const cells = { ...r.cells };
          delete cells[colId];
          return { ...r, cells };
        }),
      });
    },
    [columns, rows, sort, updateContent],
  );

  const renameColumn = useCallback(
    (colId: string, name: string) =>
      updateContent({
        type: "table",
        columns: columns.map((c) => (c.id === colId ? { ...c, name } : c)),
        rows,
      }),
    [columns, rows, updateContent],
  );

  const addRow = useCallback(() => {
    const cells: TableRow["cells"] = {};
    for (const col of columns) cells[col.id] = "";
    updateContent({ type: "table", columns, rows: [...rows, { id: nanoid(), cells }] });
  }, [columns, rows, updateContent]);

  const deleteRow = useCallback(
    (rowId: string) =>
      updateContent({
        type: "table",
        columns,
        rows: rows.filter((r) => r.id !== rowId),
      }),
    [columns, rows, updateContent],
  );

  const updateCell = useCallback(
    (rowId: string, colId: string, value: string) =>
      updateContent({
        type: "table",
        columns,
        rows: rows.map((r) =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r,
        ),
      }),
    [columns, rows, updateContent],
  );

  const toggleSort = useCallback((colId: string) => {
    setSort((prev) => {
      if (!prev || prev.colId !== colId) return { colId, dir: "asc" };
      if (prev.dir === "asc") return { colId, dir: "desc" };
      return null; // third click clears sort
    });
  }, []);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, colId: string) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const colIdx = columns.findIndex((c) => c.id === colId);
      const rowIdx = sortedRows.findIndex((r) => r.id === rowId);
      let nextCol = colIdx + (e.shiftKey ? -1 : 1);
      let nextRow = rowIdx;
      if (nextCol < 0) {
        nextCol = columns.length - 1;
        nextRow--;
      } else if (nextCol >= columns.length) {
        nextCol = 0;
        nextRow++;
      }
      if (nextRow < 0 || nextRow >= sortedRows.length) return;
      const key = `${sortedRows[nextRow].id}-${columns[nextCol].id}`;
      cellRefs.current.get(key)?.focus();
    },
    [columns, sortedRows],
  );

  function startHeaderEdit(col: TableColumn) {
    setDraft(col.name);
    setEditTarget({ kind: "header", colId: col.id });
  }

  function commitHeaderEdit(col: TableColumn) {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return; // discard — Escape was pressed
    }
    renameColumn(col.id, draft.trim() || col.name);
    setEditTarget(null);
  }

  // ---- Empty-state (no columns) ----------------------------------------

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">No columns yet — add one to get started.</p>
        <Button size="sm" variant="outline" onClick={addColumn}>
          <Plus />
          Add Column
        </Button>
      </div>
    );
  }

  // ---- Full table -------------------------------------------------------

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addColumn}>
          <Plus />
          Add Column
        </Button>
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus />
          Add Row
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="group/col min-w-32 border-b border-r px-0 py-0 text-left font-medium last:border-r-0"
                >
                  <div className="flex items-center gap-0.5 px-2 py-1.5">
                    {editTarget?.kind === "header" && editTarget.colId === col.id ? (
                      // Inline header rename input
                      <input
                        className="min-w-0 flex-1 rounded bg-transparent px-1 text-sm font-medium outline-none ring-1 ring-ring"
                        value={draft}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitHeaderEdit(col)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            commitHeaderEdit(col);
                          }
                          if (e.key === "Escape") {
                            cancelEditRef.current = true;
                            setEditTarget(null);
                          }
                        }}
                      />
                    ) : (
                      <>
                        {/* Column name — click to rename */}
                        <button
                          className="min-w-0 flex-1 truncate text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          onClick={() => startHeaderEdit(col)}
                          title="Click to rename"
                        >
                          {col.name}
                        </button>
                        {/* Sort toggle */}
                        <button
                          className={cn(
                            "shrink-0 rounded p-0.5 transition-colors hover:bg-muted",
                            sort?.colId === col.id
                              ? "text-foreground"
                              : "text-muted-foreground/50 opacity-0 group-hover/col:opacity-100",
                          )}
                          onClick={() => toggleSort(col.id)}
                          title={`Sort by ${col.name}`}
                        >
                          <SortIcon sort={sort} colId={col.id} />
                        </button>
                      </>
                    )}
                    {/* Delete column */}
                    <button
                      className="ml-0.5 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover/col:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteColumn(col.id)}
                      title={`Delete "${col.name}"`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </th>
              ))}
              {/* Spacer header for row-delete column */}
              <th className="w-8 border-b bg-muted/50" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No rows yet — click &ldquo;Add Row&rdquo; to add one.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.id} className="group/row hover:bg-muted/20">
                  {columns.map((col) => (
                    <td key={col.id} className="border-b border-r p-0 last:border-r-0">
                      <input
                        ref={(el) => {
                          const key = `${row.id}-${col.id}`;
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        className="w-full bg-transparent px-2 py-1.5 outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                        value={row.cells[col.id] ?? ""}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, row.id, col.id)}
                      />
                    </td>
                  ))}
                  {/* Delete row button */}
                  <td className="w-8 border-b p-0">
                    <button
                      className="flex size-full items-center justify-center p-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-destructive"
                      onClick={() => deleteRow(row.id)}
                      title="Delete row"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      <p className="text-xs text-muted-foreground">
        {rows.length} {rows.length === 1 ? "row" : "rows"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — guards for correct content type before mounting editor
// ---------------------------------------------------------------------------

export function TableView() {
  const { activePage, updatePageContent } = useAppState();

  if (!activePage || activePage.content.type !== "table") return null;

  const page = activePage as Page & { content: TableContent };

  return (
    <TableEditor
      page={page}
      updateContent={(next) => updatePageContent(activePage.id, next)}
    />
  );
}
