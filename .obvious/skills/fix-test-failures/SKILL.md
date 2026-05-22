# Fix Test Failures Skill

Iteratively fix all failing tests in a test suite by recording failures with Replay, analyzing root causes with Loop QA, generating patches via parallel subagents, synthesizing and committing fixes, then re-running until the suite is green.

## Prerequisites

- Replay skill configured and working (see `.obvious/skills/replay/SKILL.md`)
- Loop QA skill configured (see `.obvious/skills/loop-qa/SKILL.md`)
- `LOOP_QA_API_KEY` secret available
- `REPLAY_API_KEY` secret available
- App running locally or accessible at a known URL

---

## Overview

The main agent drives a loop:

```
record failures → create Loop QA projects → spawn subagents (parallel) → synthesize patches → commit → re-run → repeat
```

Each iteration reduces the failure count. Stop when the test suite passes fully or no further progress is being made.

---

## Phase 1: Record Failures

**Skip this phase if you already have recording IDs and error messages for all failures.**

Follow `.obvious/skills/replay/SKILL.md` to:
1. Start the app
2. Run the full test suite with Replay Chromium recording enabled
3. Upload all recordings
4. Collect: for each failure — the scenario name, error message + stack trace, and Replay recording ID

Output of this phase: a table of `{ scenario, error, recording_id }` for every failing test.

---

## Phase 2: Create Loop QA Projects

For each failure from Phase 1, create a Loop QA project following `.obvious/skills/loop-qa/SKILL.md`:

```bash
curl -s -X POST https://loop-qa.replay.io/api/v1/projects \
  -H "Authorization: Bearer $LOOP_QA_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"<scenario name> — <short error description>\",
    \"recording_id\": \"<recording_id>\",
    \"instructions\": \"Analyze this Replay recording of a failing automated test.\\n\\nTest source:\\n<raw URL to test file>\\n\\nError:\\n<full error message and stack trace>\\n\\nExplain the root cause of the failure and what code change would fix it.\"
  }"
```

Collect the project ID for each failure. These can all be created in parallel — there is no dependency between them.

---

## Phase 3: Spawn Subagents (Parallel)

Spawn one subagent per failing test. Each subagent receives:
- The scenario name and test file location (with line number)
- The error message
- The Loop QA project ID
- The Replay recording ID
- The full test source URL

**Each subagent must:**

### 3a. Poll Loop QA until analysis completes

```bash
while true; do
  STATUS=$(curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/status" \
    -H "Authorization: Bearer $LOOP_QA_API_KEY")
  echo "$STATUS"
  # Stop if status indicates completion or bugs found
  echo "$STATUS" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
      const s = JSON.parse(d);
      const status = s.project?.status || s.status || '';
      const bugs = s.bugs || 0;
      if (status === 'complete' || bugs > 0) process.exit(0);
      process.exit(1);
    })
  " && break
  sleep 30
done
```

### 3b. Fetch full bug report

```bash
BUGS=$(curl -s "https://loop-qa.replay.io/api/v1/projects/$PROJECT_ID/bugs" \
  -H "Authorization: Bearer $LOOP_QA_API_KEY")

BUG_ID=$(echo $BUGS | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).items[0].id))")

curl -s "https://loop-qa.replay.io/api/v1/bugs/$BUG_ID" \
  -H "Authorization: Bearer $LOOP_QA_API_KEY"
```

### 3c. Produce output

Each subagent reports back with:

1. **Root cause summary** (2–4 sentences): what is broken and why
2. **Affected file(s) and line(s)**: specific location(s) in the source code
3. **Patch**: a concrete code change (unified diff or clear before/after) that fixes the root cause
4. **Confidence**: high / medium / low — based on how specific Loop QA's analysis was

If Loop QA returns no bugs or the analysis is unclear, the subagent should still attempt a patch based on the error message and test source, noting low confidence.

---

## Phase 4: Synthesize and Commit

Once all subagents have reported back, the main agent:

### 4a. Deduplicate

Group patches by affected file. Multiple failures may share the same root cause (e.g. the `setContent` feedback loop pattern). Apply each root-cause fix once — do not apply conflicting patches to the same lines.

### 4b. Apply patches

Apply all patches to the source files. For each:
- Read the current file
- Apply the change
- Sanity-check the diff looks correct

### 4c. Commit

```bash
git add -A
git commit -m "Fix test failures: <one-line summary of what was fixed>

Fixes:
- <scenario1>: <root cause in one line>
- <scenario2>: <root cause in one line>
...

Analysis via Loop QA / Replay."
```

Do **not** push unless the user explicitly asks.

---

## Phase 5: Re-run and Iterate

After committing, re-run the test suite (with Replay recording if needed):

```bash
node test-editor-suite.cjs 2>&1 | tee /tmp/rerun-output.log
```

Check results:
- **All pass** → done. Report the final state to the user.
- **Some still fail** → go back to Phase 1 (or Phase 2 if recordings still exist). Only re-record scenarios that were not fixed.
- **New failures introduced** → treat them as new failures and include in the next iteration.
- **No progress after 2 iterations** → stop and report to the user with a detailed list of remaining failures and hypotheses.

---

## Main Agent Coordination Protocol

```
iteration = 1
while failures exist and iteration <= MAX_ITERATIONS (default: 3):
  1. Record failures (Phase 1) — skip if recordings already in hand
  2. Create Loop QA projects in parallel (Phase 2)
  3. Spawn one subagent per failure in parallel (Phase 3) — wait for ALL to complete
  4. Synthesize patches, deduplicate, apply, commit (Phase 4)
  5. Re-run test suite (Phase 5)
  6. If all pass: report success, stop
  7. If some fail: iteration++, continue
Report final status with: pass count, fail count, commits made, remaining failures
```

---

## Reporting

At the end of each iteration, report:

| Scenario | Status | Root Cause (brief) | Confidence |
|----------|--------|--------------------|------------|
| scenario01 | ✅ Fixed | setContent feedback loop in RichTextEditor | High |
| scenario02 | ❌ Still failing | Focus lost after Tippy menu dismiss | Medium |

Final report should include total commits made and a link to the Loop QA project for each failure.

---

## Known Failure Patterns (TipTap editor test suite)

See `.obvious/skills/loop-qa/SKILL.md` for Pattern A/B/C descriptions. These patterns inform patch generation when Loop QA analysis is ambiguous.

