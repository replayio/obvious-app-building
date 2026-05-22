import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { FormattingToolbar } from './FormattingToolbar';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { SlashCommand } from '../../extensions/SlashCommand';
import { KeyboardFixes } from '../../extensions/KeyboardFixes';
import { CodeBlockLines } from '../../extensions/CodeBlockLines';
import { TableSelectionFix } from '../../extensions/TableSelectionFix';

interface Props {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: Props) {
  // Track whether the last content update originated from THIS editor instance.
  // When it did, we must NOT call setContent() in the effect — doing so would
  // reset the cursor position on every keystroke.
  const internalUpdateRef = useRef(false);
  const prevContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-600 underline cursor-pointer' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-xl my-4' } }),
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Type '/' for commands…" }),
      SlashCommand,
      KeyboardFixes,
      CodeBlockLines,
      TableSelectionFix,
    ],
    content: (() => {
      try { return JSON.parse(content); } catch { return content; }
    })(),
    onUpdate: ({ editor: e }) => {
      // Mark that the next content prop change comes from us, not an external source.
      internalUpdateRef.current = true;
      onChange(JSON.stringify(e.getJSON()));
    },
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] px-2 py-2' },
      handleDOMEvents: {
        // ProseMirror defers selectionToDOM on Chrome after clicks (its
        // drag-detection workaround). This can cause keyboard.insertText()
        // in Playwright to insert at the stale DOM selection position instead
        // of ProseMirror's internal cursor. Intercept beforeinput (which IS
        // cancelable) to route insertText through ProseMirror directly.
        beforeinput: (view, event) => {
          const e = event as InputEvent;
          if (e.inputType !== 'insertText' || !e.data || view.composing) return false;
          // Only intercept when the cursor is inside a table cell.
          // ProseMirror defers selectionToDOM on Chrome after clicks, which can
          // cause keyboard.insertText() to land at the stale DOM selection
          // (outside the table). Routing through PM's selection fixes this.
          const { $from } = view.state.selection;
          let insideTableCell = false;
          for (let d = $from.depth; d >= 0; d--) {
            const name = $from.node(d).type.name;
            if (name === 'tableCell' || name === 'tableHeader') {
              insideTableCell = true;
              break;
            }
          }
          if (!insideTableCell) return false;
          e.preventDefault();
          const { state } = view;
          view.dispatch(
            state.tr
              .insertText(e.data, state.selection.from, state.selection.to)
              .scrollIntoView()
          );
          return true;
        },
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;
      // Only apply the incoming content to the editor when the change came
      // from an external source (e.g. collaborative sync, doc switch).
      // Skip when we emitted the change ourselves to avoid cursor resets.
      if (!internalUpdateRef.current) {
        try {
          editor.commands.setContent(JSON.parse(content));
        } catch {
          editor.commands.setContent(content);
        }
      }
      internalUpdateRef.current = false;
    }
  }, [content, editor]);

  return (
    <div className="relative">
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed, from, to }) =>
            from !== to && !ed.isActive('image') && !ed.isActive('youtube')
          }
        >
          <FormattingToolbar editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

