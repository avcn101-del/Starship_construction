# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat (session
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this first, then `CLAUDE.md`,
`DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#188, current design in `DESIGN.md`.
- **E1 amended by the owner (#188)**: a scenario withdrawn for a
  specification error, with a passing successor, does not block E1.
- **Mission 0 L0 (materials) done and merged**: 12 scenarios, all locked
  before their first run, all PASS, VERIFIED by independent reviewer and
  physics-checker sessions; 12/12 VERIFIED on `main` (`node tools/m0.js
  regress`).
- **Approval tiers (#180)**: the owner decides direction; the lead designer
  decides and records everything technical (*LD* rows), reports it here,
  and merges after a clean review. Spending cap: 20 USD of sessions per
  level. Documentation-only commits by the lead designer go straight to
  `main`.
- **L1 plan approved** (#181–#184, `DESIGN.md` §13c): nine rooms, the
  per-room heat model, 13 scenarios, constants with ranges.
- Roles (#167): lead designer (the chat with the owner), engineer,
  reviewer, physics checker, each its own session (`.claude/agents/`).

## Open pull requests

| PR | Branch | State |
|---|---|---|
| #5 Mission 0, L1: one room alone | `m0/l1-rooms` → `main` | opened 2026-10-21 03:33 UTC: 12 PASS, 1 recorded FAIL (`L1.radiator.steady`, a spec error, #185), 24/24 VERIFIED. Physics checker done: 12 match, 1 blocking (the same spec error), 6 non-blocking, answered in #187. Engineer fixes of #185 and #187 running (`session_01TQvnSvo7qZzJ4HBuas89nY`); reviewer after the fixes |

## Decisions taken by the lead designer since the owner last read (for veto)

- #181–#184: the L1 plan as proposed in the chat and approved in principle
  by the owner ("duyệt theo đề xuất").
- #185: answers to the engineer's nine questions on PR #5 (a v2 for the
  failed radiator scenario, the float slack kept, the hold as ninth room,
  the size rule, crew rounding, the kernel interpretations, the data hash
  covering `FIXED` and `ROOMS`).
- #186: order of checks on L1 and the cost so far (6.65 USD engineer).
- #187: answers to the physics checker (size rule enters the kernel at L2;
  a reactor keeps decay heat after an overheat, so without wall cooling it
  always melts down, a signal for L2; withdrawn scenarios listed in
  `mission0/withdrawn.json`).

## Awaiting the owner

Nothing. The E1 question was answered (#188). The owner reads the *LD*
list above; a veto is a message in the chat.

## Next steps

1. The engineer-fixes session lands #185 and #187 on `m0/l1-rooms`.
2. Lead designer starts the **reviewer** (sonnet: Fable is out of limit,
   and a model other than the engineer's opus) on the final head.
3. Engineer fixes blocking findings; lead designer merges when none remain
   (#180); `STATUS.md` and `DESIGN.md` §16 updated.
4. Before L2: resolve **shield budget double counting** (#170); add the
   blast closed forms to the L2 blast scenarios (#184); propose L2
   (conduction through walls, feed, shield overlap, shared repair budget).

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |

Tested on 2026-10-21: the first two firings found that a fresh session
starts **without the repository** and without the `add_repo` tool; the
third, with a plain `git clone` in the prompt, ran end to end:
12/12 VERIFIED at `40bfbc5`. Each firing costs about 0.1 USD (sonnet).

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
| Nightly regression, test 2 (no `add_repo`) | session_01Md1GQ7LftRREZ1w6sZyMpb | sonnet-5-5 | 0.09 |
| Nightly regression, test 3 (works) | session_01RQvwmFsoF6vu1G5wzQJsnP | sonnet-5-5 | 0.09 |
| Engineer, L1 (PR #5) | session_01NEZ3dFYvXRDcUQJWexkacC | opus-5-5 | 6.65 |
| Physics checker, L1 | session_01GmQGV34nzAo394dCthy28J | sonnet-5-5 | 1.22 |
| Engineer, L1 fixes (#185, #187) | session_01TQvnSvo7qZzJ4HBuas89nY | opus-5-5 | running |

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
- A scheduled task's fresh session has no repository and no `add_repo`
  tool: its prompt must `git clone` the repository first (the container's
  git proxy serves it without a token).
