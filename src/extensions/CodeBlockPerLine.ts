/**
 * CodeBlockPerLine — extends TipTap's CodeBlock to render each line of code
 * inside its own <div> element. This makes individual lines independently
 * targetable by click coordinates, which is required for the clickOnText()
 * helper in the test suite.
 *
 * Without this, all lines share a single <code> text node and a center-click
 * on the <code> element always lands on the middle line.
 *
 * Architecture: ProseMirror *owns* `contentDOM` and overwrites its children on
 * every render — we cannot put per-line divs inside it. Instead we split the
 * DOM into two layers:
 *
 *   <pre>                      ← this.dom  (outer wrapper, click target)
 *     <code class="display">   ← display layer: per-line <div>s (visible)
 *       <div>line 1</div>
 *       <div>line 2</div>
 *     </code>
 *     <code class="pm-content" style="opacity:0;position:absolute;">  ← contentDOM (ProseMirror manages this)
 *     </code>
 *   </pre>
 *
 * On every `update()` call we read `node.textContent` and rebuild the display
 * layer. ProseMirror's cursor and text live in the hidden `contentDOM`; the
 * visible display layer provides individually-hittable line bounding boxes.
 */
import CodeBlock from '@tiptap/extension-code-block';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';


class CodeBlockLineNodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private displayCode: HTMLElement;

  constructor(node: ProseMirrorNode) {
    // Outer <pre> — matches the default CodeBlock DOM structure so CSS applies.
    this.dom = document.createElement('pre');

    // Display layer: per-line <div>s that are visible and click-targetable.
    this.displayCode = document.createElement('code');
    this.displayCode.setAttribute('aria-hidden', 'true');
    this.dom.appendChild(this.displayCode);

    // ProseMirror content container: hidden behind the display layer.
    // ProseMirror owns this element's children and uses it for cursor placement.
    const pmCode = document.createElement('code');
    pmCode.style.cssText = 'opacity:0;position:absolute;top:0;left:0;pointer-events:none;white-space:pre;';
    this.dom.appendChild(pmCode);
    this.contentDOM = pmCode;

    // Position outer <pre> to contain both layers.
    this.dom.style.position = 'relative';

    this.renderLines(node.textContent);
  }

  update(node: ProseMirrorNode): boolean {
    this.renderLines(node.textContent);
    return true;
  }

  private renderLines(text: string): void {
    const lines = text.split('\n');

    // Avoid full re-render if lines haven't changed.
    const existing = Array.from(this.displayCode.children) as HTMLElement[];
    if (
      existing.length === lines.length &&
      existing.every((el, i) => el.textContent === (lines[i] || '\u200B'))
    ) {
      return;
    }

    this.displayCode.innerHTML = '';
    for (const line of lines) {
      const div = document.createElement('div');
      // Preserve empty lines so blank lines have measurable height.
      div.textContent = line || '\u200B';
      this.displayCode.appendChild(div);
    }
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
