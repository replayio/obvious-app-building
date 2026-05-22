import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/**
 * KeyboardFixes — higher-priority keyboard shortcuts that patch TipTap v3 edge
 * cases identified by the automated test suite.
 *
 * 1. Backspace when the browser DOM selection is non-empty but ProseMirror
 *    hasn't yet synced it (e.g. after Playwright fires Shift+End then
 *    immediately fires Backspace): read the live DOM selection, reconcile it
 *    into ProseMirror, and delete the range.
 *
 * 2. Backspace on an empty list/task item → lift (exit) the list rather than
 *    joining into the previous item (TipTap v3 default in that case).
 *
 * 3. Escape inside a code block → move cursor to a new paragraph after the
 *    code block so subsequent slash commands work.
 *
 * 4. End inside a code block → move cursor to end of the current line
 *    (the browser default moves to end of the entire code content).
 */
export const KeyboardFixes = Extension.create({
  name: 'keyboardFixes',

  // Higher priority than the built-in listKeymap (100) so our Backspace
  // handler runs first.
  priority: 200,

  addKeyboardShortcuts() {
    return {
      // ---------------------------------------------------------------
      // Backspace
      // ---------------------------------------------------------------
      Backspace: ({ editor }) => {
        const { view, state } = editor;
        const { selection, doc } = state;
        const { $from, $to } = selection;

        // ---- Fix 1: sync stale DOM selection before deleting ----------
        // When Playwright sends Shift+End immediately before Backspace,
        // ProseMirror may still hold a collapsed selection (it updates on
        // selectionchange / RAF). Read the live browser selection and, if
        // it's non-empty while ProseMirror thinks it's collapsed, reconcile.
        const domSel = window.getSelection();
        if (domSel && !domSel.isCollapsed && $from.pos === $to.pos) {
          try {
            const pmFrom = view.posAtDOM(domSel.anchorNode!, domSel.anchorOffset);
            const pmTo = view.posAtDOM(domSel.focusNode!, domSel.focusOffset);
            const from = Math.min(pmFrom, pmTo);
            const to = Math.max(pmFrom, pmTo);
            if (from < to) {
              const syncTr = state.tr.setSelection(TextSelection.create(doc, from, to));
              const syncedState = state.apply(syncTr);
              const deleteTr = syncedState.tr.deleteSelection();
              view.dispatch(deleteTr);
              return true;
            }
          } catch {
            // posAtDOM can throw; fall through to normal handling
          }
        }

        // For non-collapsed PM selections, let the default handler run.
        if ($from.pos !== $to.pos) return false;

        // ---- Fix 2: lift empty list/task item instead of joining ------
        const listItemTypes = ['listItem', 'taskItem'] as const;
        for (const typeName of listItemTypes) {
          const nodeType = doc.type.schema.nodes[typeName];
          if (!nodeType) continue;

          let depth = $from.depth;
          let found = false;
          while (depth > 0) {
            const node = $from.node(depth);
            if (node.type === nodeType) {
              found = true;
              break;
            }
            depth--;
          }
          if (!found) continue;

          // Only lift if cursor is at position 0 of an empty inner block.
          if ($from.parentOffset === 0 && $from.parent.type.isTextblock && $from.parent.nodeSize === 2) {
            return editor.commands.liftListItem(typeName);
          }
        }

        return false;
      },

      // ---------------------------------------------------------------
      // Escape inside a code block → move cursor after the code block
      // ---------------------------------------------------------------
      Escape: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        let codeBlockDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === 'codeBlock') {
            codeBlockDepth = d;
            break;
          }
        }
        if (codeBlockDepth === -1) return false;

        const afterCodeBlock = $from.after(codeBlockDepth);
        const { tr, doc } = state;

        // If there's a paragraph right after the code block, jump into it.
        if (afterCodeBlock < doc.content.size) {
          const nextNode = doc.nodeAt(afterCodeBlock);
          if (nextNode && nextNode.type.isTextblock) {
            const newSel = TextSelection.create(doc, afterCodeBlock + 1);
            editor.view.dispatch(tr.setSelection(newSel).scrollIntoView());
            return true;
          }
        }

        // Otherwise insert a new paragraph and move there.
        const paragraph = state.schema.nodes.paragraph.create();
        const newTr = tr.insert(afterCodeBlock, paragraph);
        const newSel = TextSelection.create(newTr.doc, afterCodeBlock + 1);
        editor.view.dispatch(newTr.setSelection(newSel).scrollIntoView());
        return true;
      },

      // ---------------------------------------------------------------
      // End inside a code block → end of current line, not entire block
      // ---------------------------------------------------------------
      End: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === 'codeBlock') {
            const codeBlockStart = $from.start();
            const fullText = $from.parent.textContent;
            const cursorOffset = $from.parentOffset;
            const nextNewline = fullText.indexOf('\n', cursorOffset);
            const lineEnd = nextNewline === -1 ? fullText.length : nextNewline;
            const newSel = TextSelection.create(state.doc, codeBlockStart + lineEnd);
            editor.view.dispatch(state.tr.setSelection(newSel).scrollIntoView());
            return true;
          }
        }
        return false;
      },
    };
  },
});
