# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat. Read this first, then
`CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#179, current design in `DESIGN.md`.
- **Mission 0 L0 (materials) done**: 12 scenarios (7 original + 5 v2), all
  locked before their first run, all PASS, all VERIFIED by independent
  reviewer and physics-checker sessions. No blocking finding.
- Roles (#167): lead designer (the chat with the owner), engineer, reviewer,
  physics checker, each its own session; definitions in `.claude/agents/`.
- **Claude merges after the owner approves each merge** (#178).

## Open pull requests

| PR | Branch | State |
|---|---|---|
| #1 Mission 0, L0: materials | `m0/l0-materials` → `main` | reviewed twice, no blocker; **awaiting the owner's approval to merge** |
| #2 Review roles | `process/review-roles` → stacked on #1 | contains #1 plus roles, #177–#179 and this file; merge **after** #1 |

## Awaiting the owner

1. **Approve merging PR #1, then PR #2.**
2. Proposals from the v2 review (none blocking):
   - **Lock coverage gap**: the lock hashes the criterion fields and `run()`,
     not module-scope constants or imports. Proposal: scenarios locked from
     L1 on hash the whole file except its `locked:` line; L0 locks stay
     (git history is their record).
   - **`kineticStop` ignores kinetic overrides**: derive it inside
     `withOverrides`, as #171 intends. A bug fix, done at the start of L1.
   - **Blast checks**: add the closed forms `escaped = max(0, cE − N·B)` and
     `absorbed = min(cE, N·B)` in the L2 blast scenarios, not a v3 now.
   - **`blast()` coupling default of 1**: make the argument required at the
     start of L1 (the old scenario's `run()` passes 1 explicitly).
   - Reminder to engineers: docs in the same commit as the feature.

## Next steps

1. After the owner approves: merge #1, then #2.
2. Create the **nightly regression** (#136) on `main` as a scheduled task
   that starts a fresh session each night, so it does not depend on any chat.
3. **Draft L1** (one room alone: reactor, radiator, magazine, turret, shield
   generator, engine, crew quarters, bridge): scenario list, criteria, and
   approved ranges proposed for the owner (#145), applying #177's threshold
   rule.
4. Start L1 with: flip the `approved` flags of #177 in `data.js`, the
   `kineticStop` fix, the required coupling argument, the new lock scope if
   approved.
5. Before L2: resolve **shield budget double counting** (#170).

## Sessions so far (all finished)

| Role | Session | Model | Cost (USD) |
|---|---|---|---|
| Reviewer, PR #1 | session_017Cy1rPGkyASqr46YBiqRA5 | fable-5-1 | 3.57 |
| Physics checker, L0 | session_01DWTkmgnhZ8uX5wY5crffj2 | sonnet-5-5 | 0.89 |
| Engineer, L0 fixes | session_012k8zVPth3PETHnbHhoZkrW | opus-5-5 | 1.54 (stopped to ask on a second task) |
| Engineer, L0 v2 | session_017g15v5xSD3RWWRRWtzuBCJ | opus-5-5 | 1.77 |
| Reviewer, fixes and v2 | session_0135xRdTHuFwAefY16Hy5vfu | fable-5-1 | 4.70 |
| Physics checker, v2 | session_01XqJFVUAYNUWsmcR9Vh8Qur | sonnet-5-5 | 0.80 |

Sessions have reported a **seven-day usage limit warning**.

## Scheduled tasks

None pending. Scheduled check-ins belong to the chat that created them; a new
chat creates its own (#179).

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
