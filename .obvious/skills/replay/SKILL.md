# Replay.io Skill — Recording Playwright Tests

## Overview

This skill documents how to record Playwright test runs with Replay.io for time-travel debugging in the `obvious-app-building` repo.

## Prerequisites

All of the following must be installed on the sandbox. Verify once; they survive sandbox restarts.

```bash
# Check Replay CLI
/home/user/.npm-global/bin/replayio version

# Check Replay Chromium runtime (downloaded on first use)
ls /home/user/.replay/runtimes/chrome-linux/chrome

# Check @replayio/playwright package (in node_modules)
node -e "const r = require('@replayio/playwright'); console.log('version:', require('@replayio/playwright/package.json').version)"

# Check Xvfb (required -- Replay Chrome does not run headless)
which Xvfb
```

If `@replayio/playwright` is missing, add it:

```bash
npm install @replayio/playwright
```

## Environment Setup

```bash
# Virtual display -- Replay Chrome requires a real display
export DISPLAY=:99
Xvfb :99 -screen 0 1280x1024x24 -ac &>/dev/null &
sleep 2
```

If `:99` is already in use, that's fine -- skip.

## API Key

The Replay API key is available as `process.env.SECRET_REPLAY_API_KEY` in the Obvious sandbox. Extract it at run-time -- never hard-code it:

```bash
export REPLAY_API_KEY=$(node -e "process.stdout.write(process.env.SECRET_REPLAY_API_KEY || '')")
```

## Recording Approach -- `--require` Preload Script

The test file (`test-editor-suite.cjs`) calls `playwright.chromium.launch()` directly. Because we cannot modify the test file to use `@replayio/playwright` natively, we monkey-patch `chromium.launch` at process start via a Node.js `--require` preload.

The preload script is committed to the repo at **`replay-preload.cjs`**.

What it does:
1. Requires `@replayio/playwright` and reads the Replay Chromium executable path via `getExecutablePath('chromium')`.
2. Replaces `pw.chromium.launch` with a wrapper that injects:
   - `executablePath` -> Replay's Chrome binary
   - `headless: false` -> Replay Chrome requires a display
   - `RECORD_ALL_CONTENT=1` env var -> enables full JS recording
   - `RECORD_REPLAY_VERBOSE=1` -> verbose recording logs (useful for debugging)

```javascript
// replay-preload.cjs -- key logic
const replayExec = require('@replayio/playwright').getExecutablePath('chromium');
const origLaunch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = function(options) {
  const merged = Object.assign({}, options, {
    executablePath: replayExec,
    headless: false,
    env: Object.assign({}, process.env, { RECORD_ALL_CONTENT: '1', RECORD_REPLAY_VERBOSE: '1' }),
  });
  return origLaunch(merged);
};
```

## Running the Test Suite

```bash
cd /home/user/work/obvious-app-building
export DISPLAY=:99
export REPLAY_API_KEY=$(node -e "process.stdout.write(process.env.SECRET_REPLAY_API_KEY || '')")

node --require ./replay-preload.cjs test-editor-suite.cjs 2>&1 | tee /tmp/test-suite-output.log
```

Use `keepAliveMs: 600000` if running via `computer-ops` -- the full suite takes ~8-10 minutes.

### Starting the Vite Preview Server First

The test suite hits `http://localhost:<PORT>/doc/doc-eng-1`. Start the preview server before running tests:

```bash
cd /home/user/work/obvious-app-building
npm run preview > /tmp/vite-preview.log 2>&1 &
sleep 4
grep -oP 'localhost:\K[0-9]+' /tmp/vite-preview.log | head -1
```

The test file reads the port from `process.env.PORT` (default 4173 for Vite preview). Set it if the server binds to a different port:

```bash
export PORT=4173
```

## Uploading Recordings

```bash
export REPLAY_API_KEY=$(node -e "process.stdout.write(process.env.SECRET_REPLAY_API_KEY || '')")
/home/user/.npm-global/bin/replayio upload --all 2>&1
```

Recordings are written to `~/.replay/recordings.log` as the tests run. Each scenario produces one recording. The `--all` flag uploads all pending recordings.

## Listing Recordings

```bash
REPLAY_API_KEY=$(node -e "process.stdout.write(process.env.SECRET_REPLAY_API_KEY || '')") \
  /home/user/.npm-global/bin/replayio ls 2>&1
```

This prints a table with recording title, UUID, and status. Replay URLs are in the form:

```
https://app.replay.io/recording/<uuid>
```

## Known Failure Patterns (from May 2026 run)

After running all 24 scenarios, 6 passed and 18 failed. Three root-cause patterns were identified:

### Pattern A -- `keyboard.type()` produces empty content (14 scenarios)

**Symptom:** After a slash command is executed, `keyboard.type()` types nothing -- the editor
paragraph contains only the block-level placeholder or empty string.

**Root cause:** The Tippy.js menu dismissal causes the TipTap editor to lose focus. The editor
focus is not restored before typing begins.

**Affected scenarios:** S02, S03, S04, S05, S06, S08, S09, S11, S14 (partially), S15, S18, S20,
S21, S23.

### Pattern B -- Slash command menu timeout in multi-block documents (3 scenarios)

**Symptom:** `page.waitForSelector('[data-tippy-root] button', { timeout: 5000 })` times out
after the 4th or 5th command in a document.

**Root cause:** In multi-block documents (many prior paragraphs), typing `/` does not reliably
trigger the slash menu -- possibly focus or scroll positioning issues.

**Affected scenarios:** S14, S16, S24.

### Pattern C -- Mouse-click repositioning side effects (2 scenarios)

**Symptom:** Clicking to reposition the cursor lands in an adjacent block or causes unexpected
content mutation on the adjacent node.

**Root cause:** `page.click()` on a specific block coordinate hits an incorrect DOM target in some
multi-block configurations.

**Affected scenarios:** S01, S19.

## Test Suite Architecture Notes

- **File:** `test-editor-suite.cjs` -- 24 scenarios, harness + scenario definitions
- **Error logging:** Line 89 logs `e.stack || e.message` (full stack trace, not first line only)
- **Screenshots:** Captured to `playwright-screenshots/<scenario-label>-fail.png` on failure
- **Browser isolation:** Each scenario runs in its own `BrowserContext`
- **Mouse-only navigation:** No arrow keys -- all cursor repositioning uses `page.click()`
- **Slash commands tested:** `/heading1`, `/heading2`, `/heading3`, `/bullet`, `/numbered`,
  `/to-do`, `/quote`, `/code`, `/divider`, `/table`, `/youtube`, `/image`, `/callout`

## MCP / Replay DevTools Analysis

To analyze a recording via the Replay MCP server:

```bash
npx @replayio/mcp --api-key $REPLAY_API_KEY
```

Or use the Replay DevTools UI at `https://app.replay.io/recording/<uuid>` directly -- you can set
breakpoints, inspect console logs, and step through execution frame-by-frame.

