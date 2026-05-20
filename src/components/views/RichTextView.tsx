"use client";

import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
} from "lucide-react";
import type { Page, RichTextContent } from "@/types";
import { useAppState } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ active, onClick, title, children }: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={title}
      aria-pressed={active}
      className={cn(active && "bg-muted text-foreground")}
      onMouseDown={(e) => {
        // Prevent editor losing focus when clicking toolbar
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// RichTextView
// ---------------------------------------------------------------------------

interface RichTextViewProps {
  page: Page;
}

export function RichTextView({ page }: RichTextViewProps) {
  const { updatePageContent } = useAppState();

  const initialContent =
    page.content.type === "rich-text"
      ? ((page.content as RichTextContent).json as JSONContent | null)
      : null;

  // Persist Tiptap JSON on every document change
  const onUpdate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ editor }: { editor: any }) => {
      const json = editor.getJSON() as JSONContent;
      updatePageContent(page.id, { type: "rich-text", json });
    },
    // page.id is stable per component instance (keyed by page.id in PageContent)
    [page.id, updatePageContent],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        // Tailwind-native prose styling without @tailwindcss/typography dependency
        class: [
          "min-h-[16rem] focus:outline-none leading-relaxed",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:my-0.5",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
          "[&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-sm [&_pre]:font-mono [&_pre]:overflow-x-auto",
          "[&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:text-sm [&_code:not(pre_code)]:font-mono",
          "[&_hr]:my-4 [&_hr]:border-border",
          "[&_p]:my-1",
        ].join(" "),
      },
    },
    onUpdate,
  });

  if (!editor) return null;

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Formatting toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-lg border bg-background p-1 shadow-sm">
        {/* Inline marks */}
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Headings */}
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Lists */}
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Block types */}
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} className="flex-1 px-1" />
    </div>
  );
}
