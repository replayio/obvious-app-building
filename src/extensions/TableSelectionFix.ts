import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * TableSelectionFix — forces ProseMirror to sync its internal selection to the
 * browser's DOM selection immediately whenever the cursor moves into a table
 * cell.
 *
 * Background: Chrome defers selectionToDOM via setTimeout when a mouse click
 * involves movement (ProseMirror's drag-detection workaround). Under CPU
 * load this timeout may not fire before keyboard.insertText() is dispatched,
 * causing text to be inserted at the stale DOM selection position (outside the
 * table) rather than the new PM selection (inside the cell).
 *
 * Fix: after every state update that places the cursor inside a table cell,
 * manually advance the browser selection to the correct DOM position using the
 * view's coordinate mapping.
 */
export const TableSelectionFix = Extension.create({
  name: 'tableSelectionFix',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableSelectionFix'),

        view() {
          return {
            update(view, prevState) {
              const { state } = view;
              // Only act when the cursor actually moved.
              if (state.selection.eq(prevState.selection)) return;

              const { $from } = state.selection;

              // Check if cursor is inside a table cell/header.
              let insideTableCell = false;
              for (let d = $from.depth; d >= 0; d--) {
                const name = $from.node(d).type.name;
                if (name === 'tableCell' || name === 'tableHeader') {
                  insideTableCell = true;
                  break;
                }
              }
              if (!insideTableCell) return;

              // The cursor is inside a table cell. Map the ProseMirror position
              // to a DOM node + offset and set the browser selection directly.
              // This overrides any stale deferred selectionToDOM.
              requestAnimationFrame(() => {
                if (!view.hasFocus()) return;
                try {
                  const { node, offset } = view.domAtPos($from.pos);
                  const sel = window.getSelection();
                  if (!sel) return;
                  const range = document.createRange();
                  range.setStart(node, offset);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                } catch {
                  // domAtPos can throw for certain positions; ignore
                }
              });
            },
          };
        },
      }),
    ];
  },
});
