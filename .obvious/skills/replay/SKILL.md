---
name: replay
version: 1.0.0
description: Record, upload, and inspect browser sessions with Replay.io for time-travel debugging. Covers CLI setup, headless recording, uploading, and using the Replay MCP server to analyze recordings.
triggers:
  - replay
  - record browser
  - time-travel debugging
  - replay.io
  - replay chromium
  - replay mcp
  - replayio
  - upload recording
  - inspect recording
successCriteria: Recording is uploaded and viewable on app.replay.io; MCP tools return data from the recording.
---

# Replay.io Skill

Record browser sessions and inspect them with Replay's time-travel debugger and MCP analysis tools.

## Environment

| Item | Path / Value |
|---|---|
| Replay CLI | `/home/user/.npm-global/bin/replayio` |
| Replay Chromium | `~/.replay/runtimes/chrome-linux/chrome` |
| API key env var | `REPLAY_API_KEY` (set from `process.env.SECRET_REPLAY_API_KEY`) |
| MCP endpoint | `https://dispatch.replay.io/nut/mcp` |
| MCP transport | HTTP SSE with `Authorization: Bearer <REPLAY_API_KEY>` |

## 1. Setup & Prerequisites

### Install system dependencies (once per sandbox)

The Replay Chromium binary requires these libraries on Ubuntu/Debian:

```bash
sudo apt-get install -y \
  libnss3 libnss3-dev \
  libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
  libgbm1 libasound2
```

**If `libasound2` fails** (renamed on newer Ubuntu):
```bash
sudo apt-get install -y libasound2t64 2>/dev/null || sudo apt-get install -y libasound2
```

### Install Replay CLI (once per sandbox)

```bash
npm install -g replayio
```

### Authenticate

```bash
export REPLAY_API_KEY="$SECRET_REPLAY_API_KEY"
# CLI reads REPLAY_API_KEY automatically — no `replayio login` needed
```

### Download Replay Chromium runtime (once per sandbox)

```bash
REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" replayio update-browsers --all
# or just run a record command — it auto-downloads if missing
```

## 2. Recording

### Headless recording (recommended for sandboxes)

The Replay CLI supports `--headless` directly — no Xvfb required:

```bash
export REPLAY_API_KEY="$SECRET_REPLAY_API_KEY"
replayio record --headless https://example.com
```

The command:
1. Launches Replay Chromium headlessly
2. Navigates to the URL
3. Records the session
4. Uploads automatically on exit
5. Prints the recording ID and `app.replay.io` URL

### With Xvfb (fallback if headless flag unavailable)

```bash
Xvfb :99 -screen 0 1280x720x24 &
DISPLAY=:99 REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" replayio record https://example.com
```

### Upload recorded sessions manually

If auto-upload was skipped or to re-upload:

```bash
REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" replayio upload --all
```

### View recordings list

```bash
REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" replayio ls
```

## 3. Viewing Recordings

After upload, recordings are available at:
```
https://app.replay.io/recording/<recording-id>
```

The CLI prints this URL directly after a successful upload.

## 4. MCP Analysis

Use the Replay MCP server to programmatically inspect recordings.

### Connection

```
Endpoint: https://dispatch.replay.io/nut/mcp
Transport: HTTP SSE
Headers: Authorization: Bearer <REPLAY_API_KEY>
```

### Available MCP tools

| Tool | Description |
|---|---|
| `Screenshot` | Capture a screenshot at a given timestamp (ms) |
| `NetworkRequest` | List network requests with status, timing, size |
| `ConsoleMessages` | Fetch console.log/warn/error messages |
| `UncaughtException` | List uncaught JS exceptions |
| `ListSources` | List all JS source files in the recording |
| `SearchSources` | Search source code by text/regex |
| `UserInteractions` | List mouse clicks, keyboard events, scrolls |
| `LocalStorage` | Read localStorage values at a point in time |
| `ReactComponentTree` | Inspect the React component tree (requires sourcemaps) |
| `ReactRenders` | List React component renders |
| `RecordingOverview` | Full overview — cold-computes, allow 3-4 min on first call |

### Example: capture a screenshot at 500ms

Call `Screenshot` with:
```json
{ "recordingId": "<id>", "pointMs": 500 }
```

Returns a signed URL like:
```
https://static.replay.io/recordings/<id>/analysis/screenshot-500.jpg
```

### Example: inspect network requests

Call `NetworkRequest` with:
```json
{ "recordingId": "<id>" }
```

Returns an array of `{ url, method, status, durationMs, responseSize }`.

## 5. Playwright / Cypress Integration

For automated test recordings, install the Replay plugin for your test runner:

```bash
# Playwright
npm install @replayio/playwright

# Cypress
npm install @replayio/cypress
```

Then run tests with the Replay browser:

```bash
# Playwright
REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" npx playwright test --reporter=@replayio/playwright/reporter

# Cypress
REPLAY_API_KEY="$SECRET_REPLAY_API_KEY" npx cypress run --browser replay-chromium
```

All test runs upload automatically and are tagged with the test name for filtering.

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `error while loading shared libraries: libnss3.so` | Run the apt-get install block in §1 |
| Recording stays at 0ms / crashes immediately | Missing system deps — check stderr for the library name |
| `RecordingOverview` times out | Normal on first call (cold compute). Wait 3-4 min and retry. Individual tools work immediately. |
| `replayio: command not found` | Add npm global bin to PATH: `export PATH="$HOME/.npm-global/bin:$PATH"` |
| Upload hangs | Check `REPLAY_API_KEY` is set and valid; try `replayio upload --all` explicitly |
| No sourcemaps in `ListSources` | App was built without sourcemaps (production minified build). `ReactComponentTree`/`ReactRenders` won't work. |
| MCP returns 401 | `Authorization: Bearer` header missing or API key expired |

## 7. Known Working Configuration (Replay.io sandbox)

- **CLI version:** v1.8.2
- **Runtime:** linux-chromium-20260421 (Chromium 108.0.0 fork)
- **Headless recording:** ✅ `--headless` flag works directly
- **MCP transport:** HTTP SSE with Bearer auth ✅
- **Test target:** https://gentle-travesseiro-d3c6cf.netlify.app (Next.js Notebook app)
- **Sample recording:** `994543b8-7913-409a-a80c-fe2e1f6175db` — 415ms duration, 10 network requests, 0 errors

