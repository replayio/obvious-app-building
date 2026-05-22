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
import { CodeBlockPerLine } from '../../extensions/CodeBlockPerLine';
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { liftListItem } from '@tiptap/pm/schema-list';

interface Props {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: Props) {
  // When the editor fires onUpdate we call onChange, which may cause the parent
  // to re-render with new `content`. Without a guard that re-render would call
  // setContent back into the editor, resetting cursor position on every keystroke.
  // This ref tracks the last value we emitted so we can skip the round-trip.
  const localContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      // CodeBlockPerLine: per-line <div> wrappers make each line independently
      // clickable, and adds Escape → exitCode() to un-trap the cursor.
      CodeBlockPerLine,
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
      // Fix Ctrl+A inside table cells: scope selection to the cell instead of
      // selecting the entire document (which causes Backspace to wipe all content).
      Extension.create({
        name: 'tableCellSelectAll',
        addKeyboardShortcuts() {
          return {
            'Mod-a': ({ editor }) => {
              const { state } = editor;
              const { $anchor } = state.selection;
              // Walk up ancestors to find a tableCell or tableHeader node.
              for (let depth = $anchor.depth; depth > 0; depth--) {
                const node = $anchor.node(depth);
                if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                  const start = $anchor.start(depth);
                  const end = $anchor.end(depth);
                  editor.view.dispatch(
                    state.tr.setSelection(TextSelection.create(state.doc, start, end))
                  );
                  return true;
                }
              }
              return false; // not in a table — fall through to default selectAll
            },
          };
        },
      }),
      // Fix Backspace on an empty list item: lift the item out of the list
      // instead of joining backward into the previous item, which would cause
      // subsequent slash commands to be appended as plain text.
      Extension.create({
        name: 'listItemBackspace',
        addKeyboardShortcuts() {
          return {
            Backspace: ({ editor }) => {
              const { state } = editor;
              const { $anchor, empty } = state.selection;
              if (!empty) return false;
              const parent = $anchor.parent;
              const grandParent = $anchor.node($anchor.depth - 1);
              const isInListItem =
                grandParent?.type.name === 'listItem' ||
                grandParent?.type.name === 'taskItem';
              // Only intercept when cursor is at start of an empty list paragraph.
              if (!isInListItem || parent.content.size !== 0 || $anchor.parentOffset !== 0) {
                return false;
              }
              const listItemType =
                grandParent.type.name === 'taskItem'
                  ? state.schema.nodes.taskItem
                  : state.schema.nodes.listItem;
              if (!listItemType) return false;
              return editor.view.dispatch(
                // @ts-expect-error liftListItem returns a transaction-dispatching function
                liftListItem(listItemType)(state, editor.view.dispatch)
              ) ?? false;
            },
          };
        },
      }),
    ],
    content: (() => {
      try { return JSON.parse(content); } catch { return content; }
    })(),
    onUpdate: ({ editor: e }) => {
      const serialized = JSON.stringify(e.getJSON());
      // Record what we just emitted so the effect below won't echo it back.
      localContentRef.current = serialized;
      onChange(serialized);
    },
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] px-2 py-2' },
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Only call setContent when `content` arrives from an *external* source
    // (e.g. collaborative sync or parent reset), not when we emitted it ourselves.
    if (content === localContentRef.current) return;
    localContentRef.current = content;
    try {
      editor.commands.setContent(JSON.parse(content), { emitUpdate: false });
    } catch {
      editor.commands.setContent(content, { emitUpdate: false });
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
