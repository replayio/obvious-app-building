"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Book, Page } from "@/types";

interface SidebarProps {
  books: Book[];
  pagesForBook: (bookId: string) => Page[];
  activeBookId: string | null;
  activePageId: string | null;
  onCreateBook: (name: string) => void;
  onRenameBook: (id: string, name: string) => void;
  onDeleteBook: (id: string) => void;
  onCreatePage: (bookId: string, title: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onDeletePage: (id: string) => void;
  onSelectPage: (pageId: string) => void;
  onSelectBook: (bookId: string) => void;
}

export function Sidebar({
  books,
  pagesForBook,
  activeBookId,
  activePageId,
  onCreateBook,
  onRenameBook,
  onDeleteBook,
  onCreatePage,
  onRenamePage,
  onDeletePage,
  onSelectPage,
  onSelectBook,
}: SidebarProps) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(
    new Set(activeBookId ? [activeBookId] : []),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingBookName, setCreatingBookName] = useState<string | null>(null);
  const [creatingPageForBook, setCreatingPageForBook] = useState<string | null>(
    null,
  );
  const [newPageTitle, setNewPageTitle] = useState("");

  function toggleBook(bookId: string) {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
    onSelectBook(bookId);
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function commitRename(type: "book" | "page") {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    if (type === "book") onRenameBook(renamingId, renameValue.trim());
    else onRenamePage(renamingId, renameValue.trim());
    setRenamingId(null);
  }

  function startCreateBook() {
    setCreatingBookName("");
  }

  function commitCreateBook() {
    if (creatingBookName === null) return;
    const name = creatingBookName.trim();
    if (name) onCreateBook(name);
    setCreatingBookName(null);
  }

  function startCreatePage(bookId: string) {
    setCreatingPageForBook(bookId);
    setNewPageTitle("");
    setExpandedBooks((prev) => new Set([...prev, bookId]));
  }

  function commitCreatePage() {
    if (!creatingPageForBook) return;
    const title = newPageTitle.trim();
    if (title) onCreatePage(creatingPageForBook, title);
    setCreatingPageForBook(null);
    setNewPageTitle("");
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold text-muted-foreground">
          Notebooks
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={startCreateBook}
          aria-label="New book"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-0.5 p-2">
          {books.map((book) => {
            const expanded = expandedBooks.has(book.id);
            const pages = pagesForBook(book.id);

            return (
              <div key={book.id}>
                <ContextMenu>
                  <ContextMenuTrigger
                    onClick={() => toggleBook(book.id)}
                    className={`flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                      activeBookId === book.id && !activePageId
                        ? "bg-accent font-medium"
                        : ""
                    }`}
                  >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {renamingId === book.id ? (
                        <Input
                          className="h-6 text-sm"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename("book")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename("book");
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="truncate">{book.name}</span>
                      )}
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => startCreatePage(book.id)}
                    >
                      New Page
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => startRename(book.id, book.name)}
                    >
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteBook(book.id)}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {expanded && (
                  <div className="ml-4 space-y-0.5 py-0.5">
                    {pages.map((page) => (
                      <ContextMenu key={page.id}>
                        <ContextMenuTrigger
                          onClick={() => onSelectPage(page.id)}
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent ${
                            activePageId === page.id
                              ? "bg-accent font-medium"
                              : ""
                          }`}
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {renamingId === page.id ? (
                              <Input
                                className="h-6 text-sm"
                                value={renameValue}
                                onChange={(e) =>
                                  setRenameValue(e.target.value)
                                }
                                onBlur={() => commitRename("page")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    commitRename("page");
                                  if (e.key === "Escape")
                                    setRenamingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{page.title}</span>
                            )}
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() =>
                              startRename(page.id, page.title)
                            }
                          >
                            Rename
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="text-destructive"
                            onClick={() => onDeletePage(page.id)}
                          >
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}

                    {creatingPageForBook === book.id && (
                      <div className="ml-5 py-0.5">
                        <Input
                          className="h-6 text-sm"
                          placeholder="Page title…"
                          value={newPageTitle}
                          onChange={(e) => setNewPageTitle(e.target.value)}
                          onBlur={commitCreatePage}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitCreatePage();
                            if (e.key === "Escape")
                              setCreatingPageForBook(null);
                          }}
                          autoFocus
                        />
                      </div>
                    )}

                    <button
                      onClick={() => startCreatePage(book.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                      Add page
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {creatingBookName !== null && (
            <div className="px-2 py-1">
              <Input
                className="h-7 text-sm"
                placeholder="Book name…"
                value={creatingBookName}
                onChange={(e) => setCreatingBookName(e.target.value)}
                onBlur={commitCreateBook}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitCreateBook();
                  if (e.key === "Escape") setCreatingBookName(null);
                }}
                autoFocus
              />
            </div>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}

