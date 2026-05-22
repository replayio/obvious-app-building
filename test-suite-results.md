# Editor Test Suite Results

## Overview

`test-editor-suite.cjs` is a scenario-based Playwright test suite covering the TipTap rich-text editor. Rather than isolated feature checks, each test tells a user story — typing, invoking slash commands, navigating with arrow keys, and asserting the resulting document structure.

The suite starts a local `vite preview` server, runs 8 scenarios sequentially each in a fresh browser context, takes a screenshot per scenario, and reports a results table.

**All 13 slash commands are covered across the 8 scenarios:**
`/heading1`, `/heading2`, `/heading3`, `/bullet`, `/numbered`, `/to-do`, `/quote`, `/code`, `/divider`, `/table`, `/youtube`, `/image`, `/callout`

---

## Results

| # | Scenario | Status | Notes |
|---|---|---|---|
| S1 | Write a structured document | ❌ FAIL | Intro paragraph missing appended text — ArrowUp count lands in wrong block |
| S2 | Build a list document | ❌ FAIL | "Bananas" not replaced — Home+Delete navigation inside list item unreliable |
| S3 | Mixed content — headings, todo, divider, numbered | ❌ FAIL | Third numbered list item missing — ArrowUp overshoots into divider or prior block |
| S4 | Code and quote blocks | ❌ FAIL | Code block empty — focus does not land inside `<pre>` after slash command; typed text goes outside |
| S5 | Table editing | ❌ FAIL | Table header cells empty — Tab navigation after slash command doesn't fill `<th>` cells |
| S6 | YouTube and image embeds | ✅ PASS | iframe with YouTube src present; `<img>` tag present; captions correct |
| S7 | Callout and heading hierarchy | ❌ FAIL | `h1` not found — `/heading1` slash query matching issue (`/heading1` doesn't match title "Heading 1") |
| S8 | Delete and rewrite | ❌ FAIL | Replacement line missing — Shift+End selection + Delete sequence not clearing the line |

**Final: 1 / 8 PASS**

---

## Failure Analysis

### S1, S7 — Heading slash command query matching
The slash command filter uses `title.toLowerCase().startsWith(query.toLowerCase())`. Typing `/heading1` produces query `heading1`, which does **not** match title `"Heading 1"` (the space breaks the prefix match). The fix is to type `/Heading` and then click the specific "Heading 1 / 2 / 3" item from the popup rather than relying on query uniqueness.

S7 hits the same issue with `/heading1`, `/heading2`, `/heading3`.

### S1 — ArrowUp navigation count
After typing into the Details section, pressing ArrowUp 3 times is meant to land on the Introduction paragraph. In practice the cursor ends up inside the Details heading rather than the Introduction paragraph, so the appended text goes to the wrong location.

### S2 — List item keyboard navigation
After creating 3 bullet items, pressing ArrowUp to reach "Bananas" and using Home + repeated Delete to clear it does not reliably place the cursor at the start of that list item. The deletion either removes too few characters or doesn't fire at all.

### S3 — Numbered list ArrowUp overshoot
After typing 3 numbered items the scenario navigates up to the "Design phase" to-do item. The ArrowUp count is off — the cursor lands on the divider or a different block, so the text edit misses the target, and the assertion for the third numbered item fails.

### S4 — Code block focus after slash command
`/code` inserts a `<pre><code>` block, but the cursor does not automatically land inside it. Typed text goes to a paragraph node outside the code block, leaving the code block empty.

### S5 — Table Tab navigation after slash command
`/table` inserts a 3×3 table with a header row. Tab should advance through cells. After the slash command completes the cursor is not positioned in the first header cell, so Tab presses do not fill `<th>` elements — they remain empty and the assertion fails.

### S8 — Shift+End + Delete selection
In headless Playwright, `keyboard.down('Shift') + keyboard.press('End') + keyboard.up('Shift')` followed by `keyboard.press('Delete')` does not reliably select and clear a full line. The selection may not extend to end-of-line or Delete may only delete a single character.

---

## Patterns

- **Slash command query must match the display title exactly as a prefix.** Commands with spaces (e.g. "Heading 1", "Bullet List", "To-do List") cannot be matched by typing the full title directly because a space in the typed query dismisses the popup. The safe pattern — already demonstrated in `test-editor-matrix.cjs` — is to type a short unambiguous prefix and then click the target item by label.
- **Focus after block insertion is not guaranteed.** Code blocks and tables require an explicit click or `keyboard.press('ArrowDown')` + settle time before typing to ensure focus lands inside the new node.
- **Shift+End selection is fragile in headless mode.** Triple-click or `selectAll` within a node is more reliable for clearing a single line.
- **ArrowUp counts in multi-block documents are brittle.** TipTap treats some block types (headings, dividers, task items) as single cursor stops and others differently; the count needs empirical calibration per document shape.
