import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { SlashCommandList } from '../components/editor/SlashCommandList';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: SuggestionProps) => void;
}

const getSlashCommands = (): SlashCommandItem[] => [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: ({ editor, range }) => {
      // deleteRange collapses the block; setNode converts it to a heading.
      // Explicitly restore cursor to range.from so text goes into the heading,
      // not the trailing empty paragraph TipTap appends for schema compliance.
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).setTextSelection(range.from).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).setTextSelection(range.from).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).setTextSelection(range.from).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list',
    icon: '•—',
    command: ({ editor, range }) => {
      // After toggleBulletList the cursor lands in the trailing paragraph;
      // range.from + 2 is inside bulletList > listItem > paragraph.
      editor.chain().focus().deleteRange(range).toggleBulletList().setTextSelection(range.from + 2).run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().setTextSelection(range.from + 2).run();
    },
  },
  {
    title: 'To-do List',
    description: 'Track tasks with checkboxes',
    icon: '☑',
    command: ({ editor, range }) => {
      // taskList > taskItem > paragraph: cursor at range.from + 3
      editor.chain().focus().deleteRange(range).toggleTaskList().setTextSelection(range.from + 3).run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: '⊞',
    command: ({ editor, range }) => {
      // After insertTable, place cursor inside the first header cell (from + 4).
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).setTextSelection(range.from + 4).run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: '❝',
    command: ({ editor, range }) => {
      // toggleBlockquote wraps the block; cursor stays at range.from inside blockquote > paragraph.
      editor.chain().focus().deleteRange(range).toggleBlockquote().setTextSelection(range.from).run();
    },
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().setTextSelection(range.from).run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide the page',
    icon: '—',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'YouTube',
    description: 'Embed a YouTube video',
    icon: '▶',
    command: ({ editor, range }) => {
      const url = window.prompt('YouTube URL:');
      if (url) {
        editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
      }
    },
  },
  {
    title: 'Image',
    description: 'Embed an image from a URL',
    icon: '🖼',
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL:');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'Callout',
    description: 'Add a highlighted callout box',
    icon: '💡',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: '💡 ' }],
        attrs: { class: 'callout' },
      }).run();
    },
  },
];

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        // Allow '/' to trigger from any cursor position, not just after whitespace.
        // The default allowedPrefixes: [' '] blocks slash commands mid-word (e.g. 'Item B/').
        allowedPrefixes: null,
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: SlashCommandItem }) => {
          props.command({ editor, range } as SuggestionProps);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const commands = getSlashCommands();
          if (!query) return commands;
          return commands.filter((item) =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          );
        },
        render: () => {
          let renderer: ReactRenderer;
          let popup: TippyInstance[];

          return {
            onStart: (props: SuggestionProps) => {
              renderer = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate: (props: SuggestionProps) => {
              renderer.updateProps(props);
              popup[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              return (renderer.ref as { onKeyDown?: (props: { event: KeyboardEvent }) => boolean })?.onKeyDown?.(props) ?? false;
            },

            onExit: () => {
              popup[0].destroy();
              renderer.destroy();
            },
          };
        },
      }),
    ];
  },
});
