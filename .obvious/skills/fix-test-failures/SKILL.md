---
name: fix-test-failures
version: 2.0.0
description: Orchestrator-managed skill for iteratively fixing test suite failures. The orchestrator spawns a Test Stage worker to record failures, then a Fix Stage worker to analyze with Loop QA and apply patches, repeating until the suite is green.
triggers:
  - fix test failures
  - fix failing tests
  - test suite failing
  - repair tests
  - loop qa fix
  - replay test failures
successCriteria: All tests in the suite pass; fix commits are on the branch; orchestrator reports final pass count and iteration count.
---

# Fix Test Failures Skill

> **⚠️ ORCHESTRATOR ONLY — This skill is for the orchestrator agent exclusively.**
> Do NOT use this skill as a standalone worker. The orchestrator manages two worker stages.
> Workers receive self-contained template prompts (Sections 2 and 3) and must not load this skill file.

Iteratively fix all failing tests by recording failures with Replay, analyzing root causes with Loop QA, applying patches, and re-running until the suite is green.

## Prerequisites

- Replay skill configured (`REPLAY_API_KEY` secret available)
- Loop QA skill configured (`LOOP_QA_API_KEY` secret available)
- App running locally or accessible at a known URL
- Test suite can be run headlessly

---

## Section 1: Orchestrator Overview

The orchestrator drives a loop. Each iteration has two worker stages:

```
┌─ Iteration ──────────────────────────────────────────────────────┐
│  1. Spawn TEST STAGE worker  → produces TEST-FAILURES artifact   │
│  2. Read artifact — if no failures: done ✅                      │
│  3. Spawn FIX STAGE worker   → applies patches, commits          │
│  4. iteration++, go to 1                                         │
└──────────────────────────────────────────────────────────────────┘
Stop when: all tests pass  OR  max_iterations reached (default: 3)
```

The orchestrator passes these values to each Fix Stage worker:
- `ARTIFACT_ID` — the TEST-FAILURES document artifact ID from the Test Stage worker
- `N` — max failures to process (default: 10, user-configurable)

---

## Section 2: Test Stage — Worker Template Prompt

Spawn a worker with the following prompt. Fill in `<PORT>`, `<TEST_COMMAND>` for the specific repo.

---

```
You are a Test Stage worker. Your job is to run the test suite with Replay recording
enabled, collect all failures with their recording IDs, and write a TEST-FAILURES
document artifact. Do NOT attempt to fix anything — only record and document.

## Environment
- REPLAY_API_KEY available as: process.env.SECRET_REPLAY_API_KEY
- Replay CLI: /home/user/.npm-global/bin/replayio
- Replay Chromium: ~/.replay/runtimes/chrome-linux/chrome

## Step 1: Start the App (if not already running)

```bash
npm run preview &
sleep 5
curl -s --retry 10 --retry-delay 2 http://localhost:<PORT> > /dev/null
```

## Step 2: Run Tests with Replay Recording

```bash
export REPLAY_API_KEY="$(node -e "console.log(process.env.SECRET_REPLAY_API_KEY)")"
export PLAYWRIGHT_BROWSERS_PATH=~/.replay/runtimes

<TEST_COMMAND> 2>&1 | tee /tmp/test-output.log
```

If the test runner supports `@replayio/playwright`, enable the Replay reporter.
Otherwise recordings are created automatically by the Replay Chromium runtime.

## Step 3: Upload All Recordings

```bash
replayio upload --all
```

Capture the output — it lists recording IDs paired with test names.

## Step 4: Collect Failures

For each FAILING test, extract from /tmp/test-output.log and upload output:
- Scenario name (as shown in test output)
- Full error message + stack trace (verbatim)
- Replay recording ID (UUID)

To list recordings:
```bash
replayio ls --json 2>/dev/null
```

Record ONLY failures. Passing tests need no recording ID.

## Step 5: Write the TEST-FAILURES Document Artifact

Create a document artifact (use document-operations, NOT a file on disk) named
"TEST-FAILURES — <YYYY-MM-DD>" with this exact structure:

---
### Summary Table

| # | Scenario | Status | Replay Recording |
|---|---|---|---|
| S01 | <scenario name> | ❌ FAIL | [<short-id>](https://app.replay.io/recording/<uuid>) |
| S02 | <scenario name> | ✅ PASS | — |

Include ALL scenarios (passes and failures). Only failures get recording links.

### Failure Details

For each failing scenario:

#### S01 — <scenario name>

**Recording:** https://app.replay.io/recording/<uuid>

**Error:**
```
<full error message and stack trace, verbatim from test output>
```
---

## Step 6: Report Back

Report success with:
- Artifact ID of the TEST-FAILURES document
- Total test count
- Failure count
- Pass count
- One-sentence summary (e.g. "7 of 24 scenarios failed — all recordings uploaded.")

If zero failures: report success with failure count 0. The orchestrator will stop.
```

---

## Section 3: Fix Stage — Worker Template Prompt

Spawn a worker with the following prompt. Fill in `<ARTIFACT_ID>` and `<N>`.

---

```
You are a Fix Stage worker. Handle ALL failures yourself — do NOT spawn subagents.
Your job is to trigger Loop QA analysis on Replay recordings of failing tests,
wait for all analyses to complete, then apply the fixes Loop QA identifies.

❗ HARD RULE: You MUST wait for ALL Loop QA projects to reach status "complete" before
proceeding to any fixing step. Do not explore the codebase. Do not guess at root causes.
Do not read source files to form hypotheses. Loop QA bug reports are the sole source of
truth for what to fix. Waiting is mandatory, not optional.

## Environment
- LOOP_QA_API_KEY available as: process.env.SECRET_LOOP_QA_API_KEY
- N (max failures to process this run): <N>
- TEST-FAILURES artifact ID: <ARTIFACT_ID>

## Step 1: Read the TEST-FAILURES Document

Open artifact <ARTIFACT_ID> and extract for each failing scenario:
- Scenario ID and name
- Full error message + stack trace
- Replay recording UUID (from the recording link)
- Test file URL (raw GitHub URL to the test source file, if listed in the document)

If there are more than <N> failures, process only the first <N> in document order.

## Step 2: Create Loop QA Projects (all in parallel)

```bash
LOOP_QA_API_KEY="$(node -e "console.log(process.env.SECRET_LOOP_QA_API_KEY)")"

RESPONSE=$(curl -s -X POST https://loop-qa.replay.io/api/v1/projects \
  -H "Authorization: Bearer $LOOP_QA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<scenario id> — <short error description>",
    "recording_id": "<recording-uuid>",
    "instructions": "Analyze this Replay recording of a failing automated test.\n\nTest source:\n<raw URL to test file>\n\nError:\n<full error message and stack trace>\n\nExplain the root cause of the failure and what code change would fix it."
  }')

PROJECT_ID=$(echo $RESPONSE | node -e \
  "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
echo "<scenario id>: project $PROJECT_ID"
```

Create ALL projects before polling any of them. Collect every project ID.

## Step 3: Poll ALL Projects to Completion

❗ Do not proceed past this step until EVERY project returns status "complete".
Do not analyze partial results. Do not read source files while waiting.

```bash
LOOP_QA_API_KEY="$(node -e "console.log(process.env.SECRET_LOOP_QA_API_KEY)")"

# Run this loop for each PROJECT_ID
while true; do
  STATUS=$(curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/status" \
    -H "Authorization: Bearer $LOOP_QA_API_KEY")

  DONE=$(echo "$STATUS" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      const s = JSON.parse(d);
      const status = s.project?.status || s.status || '';
      process.stdout.write(status === 'complete' ? 'yes' : 'no');
    })")

  [ "$DONE" = "yes" ] && break
  echo "Waiting for project $PROJECT_ID... retrying in 30s"
  sleep 30
done
```

Repeat for each project ID. Analysis typically completes in 5–15 minutes per project.

## Step 4: Fetch Bug Reports

Once ALL projects are complete:

```bash
LOOP_QA_API_KEY="$(node -e "console.log(process.env.SECRET_LOOP_QA_API_KEY)")"

# List bugs
BUGS=$(curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/bugs" \
  -H "Authorization: Bearer $LOOP_QA_API_KEY")

# Get full detail for first bug
BUG_ID=$(echo $BUGS | node -e \
  "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{ \
    const items=JSON.parse(d).items; \
    console.log(items && items[0] ? items[0].id : ''); \
  })")

[ -n "$BUG_ID" ] && curl -s "https://loop-qa.replay.io/api/v1/bugs/$BUG_ID" \
  -H "Authorization: Bearer $LOOP_QA_API_KEY"
```

Run for each project. If a project has no bugs, record it as "undiagnosed" — do not guess.

## Step 5: Synthesize Patches

With ALL bug reports collected:

1. **Group by affected file** — multiple failures often share one root cause.
   Apply each fix once; never write conflicting patches to the same lines.
2. For each unique root cause, identify:
   - Affected file(s) and line(s) per Loop QA
   - Concrete patch (before/after)
   - Which scenario IDs this fix addresses
3. For undiagnosed scenarios: list them in the report, apply no speculative fix.

❗ Source files are read ONLY to apply the patch, not to form hypotheses.

## Step 6: Apply Fixes

For each patch:
1. Read the current file
2. Apply the change via edit-file
3. Verify the diff is correct before continuing

## Step 7: Commit

```bash
git add <changed files>
git commit -m "fix: resolve test failures via Loop QA analysis

Fixes:
- <S01>: <root cause one-liner>
- <S02>: <root cause one-liner>

Undiagnosed (no Loop QA bugs found):
- <S03>: <scenario name>

Analysis via Loop QA / Replay."
```

Do NOT push unless the user has explicitly asked.

## Step 8: Report Back

Report success with:
- Fixes applied: scenario ID → root cause → file(s) changed
- Undiagnosed failures: scenario IDs where Loop QA found no bugs
- Files changed
- Commit SHA
```

---

## Section 4: Orchestrator Loop Protocol

```
max_iterations = 3   # increase if user specifies
N = 10               # max failures per Fix Stage run; adjust if user specifies
iteration = 1

while iteration <= max_iterations:

  # --- Test Stage ---
  spawn TEST STAGE worker using Section 2 template
  wait for worker to complete
  read: failure_count, artifact_id from worker result

  if failure_count == 0:
    report success — suite is fully green ✅
    stop

  # --- Fix Stage ---
  spawn FIX STAGE worker using Section 3 template
    ARTIFACT_ID = <artifact_id from Test Stage above>
    N           = <N>
  wait for worker to complete

  iteration += 1

# Max iterations reached without full pass
report final status (see Section 5)
```

**Orchestrator rules:**
- Never spawn Fix Stage without a Test Stage artifact ID.
- Never skip Test Stage between iterations — always re-run tests to measure real progress.
- If Fix Stage reports ALL failures undiagnosed (Loop QA found no bugs): stop. Do not
  iterate further without diagnostic data. Report remaining failures to the user.
- Pass N from user input if provided; otherwise default to 10.

---

## Section 5: Reporting Format

### Per-Iteration Summary

| Iteration | Tests Run | Failures | Fixed | Undiagnosed | Commits |
|-----------|-----------|----------|-------|-------------|--------|
| 1 | 24 | 7 | 5 | 2 | 1 |
| 2 | 24 | 2 | 2 | 0 | 1 |

### Final Report

| Scenario | Final Status | Root Cause (brief) | Loop QA Project |
|---|---|---|---|
| S01 | ✅ Fixed | <root cause one-liner> | [link](https://loop-qa.replay.io/projects/...) |
| S02 | ✅ Fixed | <root cause one-liner> | [link](https://loop-qa.replay.io/projects/...) |
| S07 | ❌ Undiagnosed | No bugs found by Loop QA | [link](https://loop-qa.replay.io/projects/...) |

**Summary line:** `N of M tests passing after K iterations and K commits.`
