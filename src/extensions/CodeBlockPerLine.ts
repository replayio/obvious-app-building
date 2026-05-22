/**
 * CodeBlockPerLine — extends TipTap's CodeBlock to render each line of code
 * inside its own <div> element. This makes individual lines independently
 * targetable by click coordinates, which is required for the clickOnText()
 * helper in the test suite.
 *
 * Without this, all lines share a single <code> text node and a center-click
 * on the <code> element always lands on the middle line.
 */
import CodeBlock from '@tiptap/extension-code-block';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';


class CodeBlockLineNodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  constructor(node: ProseMirrorNode) {
    // Outer <pre> — matches the default CodeBlock DOM structure so CSS still applies.
    this.dom = document.createElement('pre');

    // Inner <code> acts as the ProseMirror content container.
    const code = document.createElement('code');
    this.dom.appendChild(code);
    this.contentDOM = code;

    this.update(node);
  }

  update(node: ProseMirrorNode): boolean {
    // Re-render lines on every node update so the per-line <div>s stay in sync.
    const text = node.textContent;
    const lines = text.split('\n');

    // Clear and rebuild only when content has actually changed.
    const existing = Array.from(this.contentDOM.children) as HTMLElement[];
    if (
      existing.length === lines.length &&
      existing.every((el, i) => el.textContent === lines[i])
    ) {
      return true;
    }

    this.contentDOM.innerHTML = '';
    for (const line of lines) {
      const div = document.createElement('div');
      // Preserve empty lines so blank lines have measurable height.
      div.textContent = line || '\u200B';
      this.contentDOM.appendChild(div);
    }
    return true;
  }

  stopEvent(): boolean {
    return false;
  }
}

export const CodeBlockPerLine = CodeBlock.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Exit code block on Escape — default CodeBlock has no Escape handler,
      // so pressing Escape while typing code would trap the cursor inside <pre>.
      Escape: ({ editor }) => editor.commands.exitCode(),
    };
  },

  addNodeView() {
    return ({ node }: { node: ProseMirrorNode }) =>
      new CodeBlockLineNodeView(node);
  },
});
