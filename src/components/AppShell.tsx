"use client";

import { BookOpen } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { Sidebar } from "@/components/Sidebar";
import { PageHeader } from "@/components/PageHeader";
import { PageContent } from "@/components/PageContent";

export function AppShell() {
  const {
    books,
    pagesForBook,
    activeBookId,
    activePageId,
    activePage,
    createBook,
    renameBook,
    deleteBook,
    createPage,
    renamePage,
    deletePage,
    setViewType,
    setActivePage,
    setActiveBook,
  } = useAppState();

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-base font-semibold">Notebook</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          books={books}
          pagesForBook={pagesForBook}
          activeBookId={activeBookId}
          activePageId={activePageId}
          onCreateBook={createBook}
          onRenameBook={renameBook}
          onDeleteBook={deleteBook}
          onCreatePage={createPage}
          onRenamePage={renamePage}
          onDeletePage={deletePage}
          onSelectPage={setActivePage}
          onSelectBook={setActiveBook}
        />

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activePage ? (
            <>
              <PageHeader
                key={activePage.id}
                page={activePage}
                onRename={renamePage}
                onChangeViewType={setViewType}
              />
              <PageContent page={activePage} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <BookOpen className="h-12 w-12" />
              <p className="text-lg font-medium">No page selected</p>
              <p className="text-sm">
                Create a book and add pages to get started.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

