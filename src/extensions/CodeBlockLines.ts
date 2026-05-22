import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * CodeBlockLines wraps each physical line inside a code block in a
 * `<span class="code-line">` element. This makes the tree walker in
 * clickOnText() find individual line text nodes whose parentElement
 * is a span scoped to that line, so getBoundingClientRect() returns
 * a rect that covers only the target line — not the entire code block.
 */
export const CodeBlockLines = Extension.create({
  name: 'codeBlockLines',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('codeBlockLines'),

        props: {
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (node.type.name !== 'codeBlock') return;

              // node.textContent is all code as a single string with \n chars.
              const text = node.textContent;
              const codeStart = pos + 1; // first char inside codeBlock

              let lineStart = 0;
              for (let i = 0; i <= text.length; i++) {
                if (i === text.length || text[i] === '\n') {
                  const lineEnd = i;
                  const from = codeStart + lineStart;
                  const to = codeStart + lineEnd;
                  // Only create a decoration if the line has content.
                  if (to > from) {
                    decorations.push(
                      Decoration.inline(from, to, {
                        nodeName: 'span',
                        class: 'code-line',
                      })
                    );
                  }
                  lineStart = i + 1;
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
