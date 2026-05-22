# Loop QA Skill

Use loop-qa.replay.io to analyze Replay recordings of test failures. Loop QA's AI agent watches the recording and generates structured bug reports explaining root causes.

## Prerequisites

- A Replay recording ID (UUID) — must already be uploaded to app.replay.io
- A loop-qa API key (Bearer token starting with `lqa_`) — generate at https://loop-qa.replay.io in Settings
- The loop-qa API key should be stored as a secret `LOOP_QA_API_KEY` in the project

## Creating a Project

`POST https://loop-qa.replay.io/api/v1/projects`

Headers:
```
Authorization: Bearer <LOOP_QA_API_KEY>
Content-Type: application/json
```

Body:
```json
{
  "name": "<descriptive name for the failure>",
  "recording_id": "<replay-recording-uuid>",
  "instructions": "<see Instructions Format below>",
  "webhook_url": "<optional — receives push notification with full bug payload on completion>"
}
```

- `recording_id` causes Loop QA to analyze the existing Replay recording instead of running a live exploration. `target_url` is not required.
- The response includes a project `id` — save this for polling.

## Instructions Format

The `instructions` field guides the Loop QA AI agent. Include:

1. **A raw link to the test source** — a direct URL to the test file (e.g. a raw GitHub URL)
2. **The full error message** — the exact error text and stack trace from the test run

Example:
```
Analyze this Replay recording of a failing automated test to determine the root cause of the failure.

Test source:
https://raw.githubusercontent.com/org/repo/refs/heads/branch/test-file.cjs

Error:
Error: <error message here>
    at <function> (<file>:<line>:<col>)
    at async <function> (<file>:<line>:<col>)

<Optional: brief description of what the test was doing and what was expected vs. actual.>
```

## Polling for Results

After creating the project, poll until analysis is complete:

**Check status:**
`GET https://loop-qa.replay.io/api/v1/projects/{id}/status`

Poll every 30 seconds. Analysis typically completes within 5–15 minutes.

**List bugs:**
`GET https://loop-qa.replay.io/api/v1/projects/{id}/bugs`

**Get full bug detail:**
`GET https://loop-qa.replay.io/api/v1/bugs/{bug_id}`

Bug reports include: title, severity, analysis (root cause explanation), reproduction steps, and optionally a deep-linked Replay recording URL.

## Webhook Alternative

Set `webhook_url` on project creation to receive a push notification with the full bug payload when analysis completes, instead of polling.

## Full curl Example

```bash
# Create project
LOOP_QA_API_KEY="lqa_..."
RECORDING_ID="c56e19c6-38c2-4766-8310-255765d756ae"

RESPONSE=$(curl -s -X POST https://loop-qa.replay.io/api/v1/projects \
  -H "Authorization: Bearer $LOOP_QA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"scenario01 — Appended intro text missing\",
    \"recording_id\": \"$RECORDING_ID\",
    \"instructions\": \"Analyze this Replay recording of a failing automated test.\\n\\nTest source:\\nhttps://raw.githubusercontent.com/org/repo/refs/heads/branch/test.cjs\\n\\nError:\\nError: Appended intro text missing.\\n    at scenario01 (test-editor-suite.cjs:207:11)\"
  }")

PROJECT_ID=$(echo $RESPONSE | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
echo "Project ID: $PROJECT_ID"

# Poll status
while true; do
  STATUS=$(curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/status" \
    -H "Authorization: Bearer $LOOP_QA_API_KEY")
  echo "Status: $STATUS"
  # Check if complete — adjust condition based on actual status field
  echo "$STATUS" | grep -q '"status":"complete"' && break
  sleep 30
done

# Fetch bugs
curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/bugs" \
  -H "Authorization: Bearer $LOOP_QA_API_KEY"
```

## API Reference

Base URL: `https://loop-qa.replay.io/api/v1/`
Full OpenAPI spec: `https://loop-qa.replay.io/api/v1/openapi.json`

Key endpoints:
| Method | Path | Purpose |
|--------|------|---------|
| POST | /projects | Create project with recording |
| GET | /projects/{id} | Get project details |
| GET | /projects/{id}/status | Poll analysis status |
| GET | /projects/{id}/bugs | List bugs found |
| GET | /bugs/{id} | Full bug detail |
