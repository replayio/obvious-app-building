"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/useAppState";
import type { Page, PlainTextContent } from "@/types";

interface PlainTextViewProps {
  page: Page;
}

/** Count newlines in a string to get number of text lines (min 1). */
function countLines(text: string): number {
  if (text.length === 0) return 1;
  return text.split("\n").length;
}

export function PlainTextView({ page }: PlainTextViewProps) {
  const { updatePageContent } = useAppState();

  // Narrow content type — page.viewType guarantees this shape.
  const content = page.content as PlainTextContent;

  // Local draft tracks the textarea value for instant feedback;
  // changes propagate to the store (which debounces localStorage).
  const [text, setText] = useState(content.text);
  const [monospace, setMonospace] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Grow the textarea to fit its content (no scrollbar inside). */
  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setText(next);
      autoGrow();
      updatePageContent(page.id, { type: "plain-text", text: next });
    },
    [page.id, updatePageContent],
  );

  // Auto-grow on mount and when the page changes.
  useEffect(() => {
    autoGrow();
  }, [page.id, text]);

  const lineCount = countLines(text);

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
        <div className="ml-auto">
          <Button
            variant={monospace ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMonospace((m) => !m)}
            aria-pressed={monospace}
            title="Toggle monospace font"
          >
            Mono
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <textarea
          ref={textareaRef}
          className={[
            "w-full resize-none bg-transparent text-sm leading-relaxed outline-none",
            "placeholder:text-muted-foreground",
            monospace ? "font-mono" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={text}
          onChange={handleChange}
          placeholder="Start typing…"
          rows={1}
          spellCheck
        />
      </div>
    </div>
  );
}

