# TipTap Editor Test Suite — Full Results with Replay Recordings

**Run date:** 2026-05-22 · **Result:** 6 PASS / 18 FAIL / 24 total  
**Replay Chromium:** `/home/user/.replay/runtimes/chrome-linux/chrome` with `RECORD_ALL_CONTENT=1`  
**Error logging:** Full stack traces (`e.stack`) — no truncation

---

## Summary Table

| # | Scenario | Status | Replay Recording |
|---|---|---|---|
| S01 | H2: structured document with two sections | ❌ FAIL | [c56e19c6](https://app.replay.io/recording/c56e19c6-38c2-4766-8310-255765d756ae) |
| S02 | Bullet list: create and mouse-edit an item | ❌ FAIL | [c337757d](https://app.replay.io/recording/c337757d-2602-4918-a9b4-398db97b2990) |
| S03 | Numbered list: create and append to an item | ❌ FAIL | [9af28793](https://app.replay.io/recording/9af28793-e6f7-4b7a-ad9c-1fe2e785f99e) |
| S04 | To-do list: create, check, mouse-edit an item | ❌ FAIL | [75ed900f](https://app.replay.io/recording/75ed900f-7e5f-4e9e-b3f0-cdc262d74356) |
| S05 | H1: article with mouse append to paragraph | ❌ FAIL | [cd73e508](https://app.replay.io/recording/cd73e508-d32a-41e9-b8fa-89d663c81dee) |
| S06 | H1/H2/H3 hierarchy with mouse cursor fix | ❌ FAIL | [06ac6cfd](https://app.replay.io/recording/06ac6cfd-a145-493b-9120-613e936297a9) |
| S07 | Divider: content before and after | ✅ PASS | [baa05abb](https://app.replay.io/recording/baa05abb-6c04-4527-a71e-e94ef5a13d6f) |
| S08 | Quote: create, mouse-add attribution | ❌ FAIL | [c1bcd4fb](https://app.replay.io/recording/c1bcd4fb-6f3b-4d09-868b-fb0e8ec9bdab) |
| S09 | Code block: multi-line, mouse-click to edit | ❌ FAIL | [ce10028a](https://app.replay.io/recording/ce10028a-bc69-4a41-b962-2d2bc4592f57) |
| S10 | Callout: insert, detect, mouse-append text | ✅ PASS | [614d1cfc](https://app.replay.io/recording/614d1cfc-132e-4346-abd9-4722c8d6aea0) |
| S11 | Table: fill 2 rows, mouse-click to update a cell | ❌ FAIL | [45d1c4aa](https://app.replay.io/recording/45d1c4aa-7006-4c52-bb6a-20a8f06865d4) |
| S12 | YouTube embed: assert iframe present | ✅ PASS | [1e5d06f0](https://app.replay.io/recording/1e5d06f0-4979-4ec0-9f34-83e584f7c214) · [4359b549 (iframe)](https://app.replay.io/recording/4359b549-12d8-4d13-bc86-fa4610337df3) |
| S13 | Image embed: assert img tag present | ✅ PASS | [87de02ec](https://app.replay.io/recording/87de02ec-a48b-4dcf-90b3-32ab7ed2c374) |
| S14 | H1 + bullet + divider + numbered combo | ❌ FAIL | [1043cb32](https://app.replay.io/recording/1043cb32-e74c-4f34-9ecb-49aa542204a1) |
| S15 | H2 + code + quote with mouse repositioning | ❌ FAIL | [08699dcd](https://app.replay.io/recording/08699dcd-f4e1-4883-bfdf-cbeba1dba788) |
| S16 | H2 + to-do + numbered task doc | ❌ FAIL | [808b9fce](https://app.replay.io/recording/808b9fce-8d1d-4bb8-ab89-60fc68ad8612) |
| S17 | Callout + H1 + bullet, mouse-edit callout | ✅ PASS | [5b30e604](https://app.replay.io/recording/5b30e604-3faf-43ca-8319-ab99005e472c) |
| S18 | Table: 3-row inventory, mouse-edit qty cell | ❌ FAIL | [3ddf0037](https://app.replay.io/recording/3ddf0037-53be-4b55-b4fd-7cec0337905f) |
| S19 | Delete and rewrite via mouse selection only | ❌ FAIL | [32a656bc](https://app.replay.io/recording/32a656bc-ba13-4e3f-9e9e-e31d5dedb844) |
| S20 | YouTube + image in same doc, mouse add captions | ❌ FAIL | [07456187](https://app.replay.io/recording/07456187-a710-4c77-a2b2-38dff95260a2) · [8abb205e (iframe)](https://app.replay.io/recording/8abb205e-079c-4514-85c4-d0a4b0786a4d) |
| S21 | Delete a paragraph via mouse select+backspace | ❌ FAIL | [320aaf06](https://app.replay.io/recording/320aaf06-fee2-4a37-9a9e-e197f9a5777d) |
| S22 | H3 + callout + code triple combo | ✅ PASS | [dace8c99](https://app.replay.io/recording/dace8c99-d0dd-42f7-b0cf-32b03ff6d674) |
| S23 | Quote + divider + bullet editorial layout | ❌ FAIL | [d44b2bb1](https://app.replay.io/recording/d44b2bb1-0e00-4e19-ad70-ecc9caa6b2d0) |
| S24 | Full-page: all 13 slash commands in one document | ❌ FAIL | [f251d61f](https://app.replay.io/recording/f251d61f-2449-4734-97e1-67b07083bcd9) |

---

## Failure Pattern Analysis

### Pattern A — Typed text not registering (14 scenarios)

**Affected:** S02, S03, S04, S05, S06, S08, S09, S11, S15, S18, S19, S20, S23, S01 (partial)

After a `/slash-command` fires and the command node is inserted (heading, bullet, code, quote, table, callout), `keyboard.type()` calls produce empty content. The editor DOM shows the node exists but its text content is `""`.

**Hypothesis:** The editor loses focus or cursor position after a slash command resolves. The `keyboard.type()` call fires on an unfocused element, so keystrokes go nowhere.

---

### Pattern B — Slash command menu timeout (3 scenarios)

**Affected:** S14, S16, S24

In multi-block documents (4+ slash commands), a later `/` keystroke does not open the Tippy dropdown. The `[data-tippy-root] button` selector times out at 6000ms.

**Hypothesis:** After several inserts the editor state degrades — possibly a Tippy instance lifecycle issue, or the cursor is positioned outside the editor ProseMirror content area.

---

### Pattern C — Mouse-click repositioning side effects (2 scenarios)

**Affected:** S01, S19

In S01, text typed after a mouse-click lands in a different block than expected. In S19, mouse-select-to-delete has unexpected side effects on adjacent blocks.

**Hypothesis:** Mouse coordinate calculation for `clickOnText` may not account for scrolled content or ProseMirror's internal coordinate system.

---

## Failure Details (Full Stack Traces)

### S01 — H2: structured document with two sections

```
Error: Appended intro text missing. Got: My Document Title




Introduction

This is the intro paragraph. 




Details

Here are the details.Extra content.
    at scenario01 (test-editor-suite.cjs:207:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Mouse-click to reposition cursor after inserting blocks — appended text lands in wrong location (extra content appended to "Details" paragraph, not the intro paragraph).

---

### S02 — Bullet list: create and mouse-edit an item

```
Error: List item 1: expected "Apples", got ""
    at scenario02 (test-editor-suite.cjs:254:13)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Typed text after `/bullet` slash command not registering — list item content is empty string.

---

### S03 — Numbered list: create and append to an item

```
Error: Expected 4 list items, got 1
    at scenario03 (test-editor-suite.cjs:284:31)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Only the first list item is created; subsequent `keyboard.press('Enter')` + `keyboard.type()` calls do not produce additional list items.

---

### S04 — To-do list: create, check, mouse-edit an item

```
Error: "Fix bug #42" missing
    at scenario04 (test-editor-suite.cjs:321:45)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Text typed into to-do item after mouse-click repositioning not registering.

---

### S05 — H1: article with mouse append to paragraph

```
Error: h1 text wrong: 
    at scenario05 (test-editor-suite.cjs:350:48)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

H1 content is empty string — `/heading1` slash command fires but typed text does not register in the heading node.

---

### S06 — H1/H2/H3 hierarchy with mouse cursor fix

```
Error: Edited H3 "Components Layer" not found. Got: 
,

    at scenario06 (test-editor-suite.cjs:401:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Mouse-click to reposition into H3 and type edit text — content not written; heading reads empty or just a newline.

---

### S08 — Quote: create, mouse-add attribution

```
Error: Blockquote content wrong. Got: 
    at scenario08 (test-editor-suite.cjs:454:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Text typed after `/quote` slash command not registering — blockquote node content is empty.

---

### S09 — Code block: multi-line, mouse-click to edit

```
Error: clickOnText: "const x = 1;" not found in editor
    at clickOnText (test-editor-suite.cjs:170:21)
    at async scenario09 (test-editor-suite.cjs:482:3)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

`clickOnText` helper cannot locate the typed code text — the code block content is not present in the DOM.

---

### S11 — Table: fill 2 rows, mouse-click to update a cell

```
Error: Header "Player" missing. Got: 
    at scenario11 (test-editor-suite.cjs:574:57)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Table cell text typed after `/table` slash command not registering — header cell content is empty.

---

### S14 — H1 + bullet + divider + numbered combo

```
page.waitForSelector: Timeout 6000ms exceeded.
Call log:
  - waiting for locator('[data-tippy-root] button, .tippy-box button') to be visible

    at slashCmd (test-editor-suite.cjs:123:14)
    at async scenario14 (test-editor-suite.cjs:662:3)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Slash command menu not opening after multiple prior commands in the same scenario.

---

### S15 — H2 + code + quote with mouse repositioning

```
Error: Added call site missing. Got: function greet(name) {

    at scenario15 (test-editor-suite.cjs:732:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Mouse-click to reposition after existing code block content, then type additional code — the new text is not appended.

---

### S16 — H2 + to-do + numbered task doc

```
page.waitForSelector: Timeout 6000ms exceeded.
Call log:
  - waiting for locator('[data-tippy-root] button, .tippy-box button') to be visible

    at slashCmd (test-editor-suite.cjs:123:14)
    at async scenario16 (test-editor-suite.cjs:760:3)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Same as S14 — slash command menu fails to open mid-scenario in a multi-block document.

---

### S18 — Table: 3-row inventory, mouse-edit qty cell

```
Error: "Widget A" missing. cells: 
    at scenario18 (test-editor-suite.cjs:877:41)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Table cell text not registering — same as S11 but for a 3-row table.

---

### S19 — Delete and rewrite via mouse selection only

```
Error: Replacement line missing. Got: Original heading




This line stays.

Also replaced.
    at scenario19 (test-editor-suite.cjs:916:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Mouse-select + type-to-replace — the replacement text is not written. Selection deletes existing text but new typed content does not appear.

---

### S20 — YouTube + image in same doc, mouse add captions

```
Error: Edited video caption missing
    at scenario20 (test-editor-suite.cjs:965:59)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Mouse-click to position cursor after YouTube embed, then type caption — typed text not registering.

---

### S21 — Delete a paragraph via mouse select+backspace

```
Error: Section 2 content missing after deletion
    at scenario21 (test-editor-suite.cjs:1000:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Paragraph deletion via mouse-select + Backspace — deletion succeeds but unexpected side effects remove "Section 2" content as well.

---

### S23 — Quote + divider + bullet editorial layout

```
Error: Attribution missing. Got: 
    at scenario23 (test-editor-suite.cjs:1078:11)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Quote attribution text typed after mouse-click repositioning — content not registering, blockquote attribution paragraph is empty.

---

### S24 — Full-page: all 13 slash commands in one document

```
page.waitForSelector: Timeout 6000ms exceeded.
Call log:
  - waiting for locator('[data-tippy-root] button, .tippy-box button') to be visible

    at slashCmd (test-editor-suite.cjs:123:14)
    at async scenario24 (test-editor-suite.cjs:1112:3)
    at async runScenario (test-editor-suite.cjs:85:5)
    at async main (test-editor-suite.cjs:1248:7)
```

Same as S14/S16 — slash menu stops opening after several commands have been used in the same document.

---

## Passing Scenarios

| # | Scenario | Replay Recording |
|---|---|---|
| S07 | Divider: content before and after | [baa05abb](https://app.replay.io/recording/baa05abb-6c04-4527-a71e-e94ef5a13d6f) |
| S10 | Callout: insert, detect, mouse-append text | [614d1cfc](https://app.replay.io/recording/614d1cfc-132e-4346-abd9-4722c8d6aea0) |
| S12 | YouTube embed: assert iframe present | [1e5d06f0](https://app.replay.io/recording/1e5d06f0-4979-4ec0-9f34-83e584f7c214) |
| S13 | Image embed: assert img tag present | [87de02ec](https://app.replay.io/recording/87de02ec-a48b-4dcf-90b3-32ab7ed2c374) |
| S17 | Callout + H1 + bullet, mouse-edit callout | [5b30e604](https://app.replay.io/recording/5b30e604-3faf-43ca-8319-ab99005e472c) |
| S22 | H3 + callout + code triple combo | [dace8c99](https://app.replay.io/recording/dace8c99-d0dd-42f7-b0cf-32b03ff6d674) |

