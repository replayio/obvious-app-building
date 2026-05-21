import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Link,
  AlignLeft, AlignCenter, AlignRight, Code,
} from 'lucide-react';

interface Props {
  editor: Editor;
}

export function FormattingToolbar({ editor }: Props) {
  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href as string;
    const url = window.prompt('URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-xl shadow-lg">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold"><Bold size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic"><Italic size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline"><Underline size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Inline code"><Code size={15} /></button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button onClick={setLink} className={btn(editor.isActive('link'))} title="Link"><Link size={15} /></button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))} title="Align left"><AlignLeft size={15} /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))} title="Align center"><AlignCenter size={15} /></button>
      <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))} title="Align right"><AlignRight size={15} /></button>
    </div>
  );
}
