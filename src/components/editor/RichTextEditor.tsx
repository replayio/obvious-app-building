import { useEffect, useRef } from 'react';
import { TextSelection } from '@tiptap/pm/state';
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

interface Props {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: Props) {
  // Declare before useEditor so the onUpdate closure can reference it.
  // Without this, every keystroke triggers setContent() via the useEffect below,
  // resetting the cursor to the document end and splitting typed text.
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
    ],
    content: (() => {
      try { return JSON.parse(content); } catch { return content; }
    })(),
    onUpdate: ({ editor: e }) => {
      const json = JSON.stringify(e.getJSON());
      // Sync the ref before calling onChange so the content-sync useEffect sees
      // matching values and skips setContent(). Without this guard, every
      // keystroke resets the cursor to the document end via setContent().
      prevContentRef.current = json;
      onChange(json);
    },
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] px-2 py-2' },
      // Fix: triple-click in ProseMirror can produce an inverted selection where
      // anchor is at the paragraph start but focus remains at the previous cursor
      // position (document end). Intercept and constrain to the enclosing block.
      handleTripleClick(view, pos) {
        const { doc, tr } = view.state;
        const $pos = doc.resolve(pos);
        const start = $pos.start($pos.depth);
        const end = $pos.end($pos.depth);
        view.dispatch(tr.setSelection(TextSelection.create(doc, start, end)));
        return true;
      },
    },
  });

  useEffect(() => {

    if (!editor) return;
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;
      try {
        editor.commands.setContent(JSON.parse(content));
      } catch {
        editor.commands.setContent(content);
      }
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
