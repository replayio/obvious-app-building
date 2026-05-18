"use client";

import { useCallback, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import type { AppState, Book, Page, ViewType } from "@/types";
import { convertContent, defaultContent } from "@/lib/content";

const STORAGE_KEY = "notes-app-data";
const DEBOUNCE_MS = 400;

function emptyState(): AppState {
  return { books: [], pages: [], activeBookId: null, activePageId: null };
}

// --- External store backed by localStorage ---

// Persist store globals across HMR re-evaluations (FIX 3)
declare global {
  var __notesStore:
    | {
        cache: AppState | null;
        flushTimer: ReturnType<typeof setTimeout> | null;
        listeners: Array<() => void>;
      }
    | undefined;
}

if (!globalThis.__notesStore) {
  globalThis.__notesStore = { cache: null, flushTimer: null, listeners: [] };
}

const store = globalThis.__notesStore;

function emitChange() {
  for (const fn of store.listeners) fn();
}

function subscribe(listener: () => void): () => void {
  store.listeners = [...store.listeners, listener];
  // Cross-tab sync: skip when a local flush is pending to avoid clobbering edits (FIX 2)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && !store.flushTimer) {
      store.cache = null; // invalidate cache so getSnapshot re-reads
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    store.listeners = store.listeners.filter((l) => l !== listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): AppState {
  if (store.cache) return store.cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    store.cache = raw ? (JSON.parse(raw) as AppState) : emptyState();
  } catch {
    store.cache = emptyState();
  }
  return store.cache;
}

function getServerSnapshot(): AppState {
  return emptyState();
}

/** Update state: sets in-memory cache immediately, debounces localStorage write. */
function writeState(next: AppState) {
  store.cache = next;
  emitChange();
  if (store.flushTimer) clearTimeout(store.flushTimer);
  store.flushTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    store.flushTimer = null;
  }, DEBOUNCE_MS);
}

// Flush pending writes on tab close to prevent data loss (FIX 1)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (store.flushTimer) {
      clearTimeout(store.flushTimer);
      store.flushTimer = null;
      if (store.cache) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store.cache));
      }
    }
  });
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const now = () => new Date().toISOString();

  const update = useCallback(
    (fn: (prev: AppState) => AppState) => writeState(fn(getSnapshot())),
    [],
  );

  // --- Book operations ---

  const createBook = useCallback(
    (name: string): Book => {
      const book: Book = { id: nanoid(), name, createdAt: now(), updatedAt: now() };
      update((s) => ({ ...s, books: [...s.books, book], activeBookId: book.id }));
      return book;
    },
    [update],
  );

  const renameBook = useCallback(
    (id: string, name: string) => {
      update((s) => ({
        ...s,
        books: s.books.map((b) =>
          b.id === id ? { ...b, name, updatedAt: now() } : b,
        ),
      }));
    },
    [update],
  );

  const deleteBook = useCallback(
    (id: string) => {
      update((s) => {
        const pages = s.pages.filter((p) => p.bookId !== id);
        const books = s.books.filter((b) => b.id !== id);
        const activeBookId = s.activeBookId === id ? null : s.activeBookId;
        const activePageId =
          s.activePageId && pages.find((p) => p.id === s.activePageId)
            ? s.activePageId
            : null;
        return { books, pages, activeBookId, activePageId };
      });
    },
    [update],
  );

  // --- Page operations ---

  const createPage = useCallback(
    (bookId: string, title: string): Page => {
      const page: Page = {
        id: nanoid(),
        bookId,
        title,
        viewType: "plain-text",
        content: defaultContent("plain-text"),
        createdAt: now(),
        updatedAt: now(),
      };
      update((s) => ({
        ...s,
        pages: [...s.pages, page],
        activeBookId: bookId,
        activePageId: page.id,
      }));
      return page;
    },
    [update],
  );

  const renamePage = useCallback(
    (id: string, title: string) => {
      update((s) => ({
        ...s,
        pages: s.pages.map((p) =>
          p.id === id ? { ...p, title, updatedAt: now() } : p,
        ),
      }));
    },
    [update],
  );

  const deletePage = useCallback(
    (id: string) => {
      update((s) => {
        const pages = s.pages.filter((p) => p.id !== id);
        const activePageId = s.activePageId === id ? null : s.activePageId;
        return { ...s, pages, activePageId };
      });
    },
    [update],
  );

  const setViewType = useCallback(
    (pageId: string, viewType: ViewType) => {
      update((s) => ({
        ...s,
        pages: s.pages.map((p) =>
          p.id === pageId
            ? {
                ...p,
                viewType,
                content: convertContent(p.content, viewType),
                updatedAt: now(),
              }
            : p,
        ),
      }));
    },
    [update],
  );

  const updatePageContent = useCallback(
    (pageId: string, content: Page["content"]) => {
      update((s) => ({
        ...s,
        pages: s.pages.map((p) =>
          p.id === pageId ? { ...p, content, updatedAt: now() } : p,
        ),
      }));
    },
    [update],
  );

  // --- Selection ---

  const setActivePage = useCallback(
    (pageId: string | null) => {
      update((s) => {
        if (!pageId) return { ...s, activePageId: null };
        const page = s.pages.find((p) => p.id === pageId);
        return {
          ...s,
          activePageId: pageId,
          activeBookId: page ? page.bookId : s.activeBookId,
        };
      });
    },
    [update],
  );

  const setActiveBook = useCallback(
    (bookId: string | null) => {
      update((s) => ({ ...s, activeBookId: bookId }));
    },
    [update],
  );

  // --- Derived data ---

  const activePage = state.pages.find((p) => p.id === state.activePageId) ?? null;
  const activeBook = state.books.find((b) => b.id === state.activeBookId) ?? null;
  const pagesForBook = useCallback(
    (bookId: string) => state.pages.filter((p) => p.bookId === bookId),
    [state.pages],
  );

  return {
    ...state,
    activePage,
    activeBook,
    pagesForBook,
    createBook,
    renameBook,
    deleteBook,
    createPage,
    renamePage,
    deletePage,
    setViewType,
    updatePageContent,
    setActivePage,
    setActiveBook,
  };
}

