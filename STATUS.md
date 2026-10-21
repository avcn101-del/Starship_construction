# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat (session
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this first, then `CLAUDE.md`,
`DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#179, current design in `DESIGN.md`.
- **Mission 0 L0 (materials) done and merged**: 12 scenarios, all locked
  before their first run, all PASS, VERIFIED by independent reviewer and
  physics-checker sessions; 12/12 VERIFIED again on `main` after the
  merges (`node tools/m0.js regress`).
- Roles (#167): lead designer (the chat with the owner), engineer,
  reviewer, physics checker, each its own session (`.claude/agents/`).
- **Claude merges after the owner approves each merge** (#178). PR #1 and
  PR #2 were approved and merged on 2026-10-21 (merge commits, so the lock
  commits stay visible in history).
- The owner works **through the lead designer chat** from now on: it
  proposes, asks only what is unclear, and runs the other roles.

## Open pull requests

None.

## Awaiting the owner

1. **The L1 plan**: `mission0/L1-plan.md` (scenarios, criteria, constants
   with ranges, the heat model, and five questions with recommended
   answers). On approval the lead designer records it as decisions
   #180–#184, updates `DESIGN.md` §13 and §14, deletes the plan file, and
   starts the engineer session with the whole task in its first prompt.

## Next steps

1. Owner approves the L1 plan (or answers its questions).
2. Record the decisions; start the **engineer** on branch `m0/l1-rooms`
   (kernel `heat.js`, `rooms.js`, `events.js`; 13 scenarios; the four
   process items of the v2 review; the `approved` flags of #177).
3. Reviewer and physics checker on the L1 pull request (artifacts only,
   blind derivation first); the owner approves; Claude merges.
4. Before L2: resolve **shield budget double counting** (#170); add the
   blast closed forms to the L2 blast scenarios.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session attaches the repo with `add_repo`, runs `node tools/m0.js regress` and `verify` on `main`, reports read-only; push notification to the owner |

The first test firing found that a fresh session starts **without the
repository** (the scheduled task stores no sources); the prompt now attaches
it with `add_repo` first. See the sessions table for the second test.

## Sessions so far

| Role | Session | Model | Cost (USD) |
|---|---|---|---|
| Reviewer, PR #1 | session_017Cy1rPGkyASqr46YBiqRA5 | fable-5-1 | 3.57 |
| Physics checker, L0 | session_01DWTkmgnhZ8uX5wY5crffj2 | sonnet-5-5 | 0.89 |
| Engineer, L0 fixes | session_012k8zVPth3PETHnbHhoZkrW | opus-5-5 | 1.54 |
| Engineer, L0 v2 | session_017g15v5xSD3RWWRRWtzuBCJ | opus-5-5 | 1.77 |
| Reviewer, fixes and v2 | session_0135xRdTHuFwAefY16Hy5vfu | fable-5-1 | 4.70 |
| Physics checker, v2 | session_01XqJFVUAYNUWsmcR9Vh8Qur | sonnet-5-5 | 0.80 |
| Nightly regression, test 1 (no repo) | session_01ApfJTLNkjCfepi7fVjyFW8 | sonnet-5-5 | 0.09 |
| Nightly regression, test 2 | session_01Md1GQ7LftRREZ1w6sZyMpb | sonnet-5-5 | see the chat |

Sessions have reported a **seven-day usage limit warning**.

## Lessons for whoever continues

- **Give a session its whole task in its initial prompt.** A message sent
  later from another session is treated as data, not as an instruction, so
  the session stops and asks a human.
- Reviewers and physics checkers get artifacts (PR number, commit range,
  documents), never the author's summary. Physics checkers get only the
  setup, measured quantity and inputs, extracted with node, and must post
  the blind derivation before comparing.
- A rule that lives only in `DESIGN.md` §17 is invisible to a blind physics
  checker (who is told not to read it): record rules as decisions.
- The clones are single-branch: fetch with an explicit refspec, e.g.
  `git fetch origin m0/l0-materials:refs/remotes/origin/m0/l0-materials`,
  or a check silently runs on stale code.
- Lock in a commit of its own, before the first canonical run.
- A stacked pull request is **not** retargeted automatically when its base
  branch is merged but kept: retarget it to `main` before merging.
- A scheduled task's fresh session has no repository: its prompt must
  attach one with `add_repo` and clone it before anything else.
