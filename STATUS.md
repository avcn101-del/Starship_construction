# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat
`session_013PTXKzyTQkpVaKYQyBhRP8` (took over from
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#215, current design in `DESIGN.md`.
- **Mission 0 L0, L1 and L2 done and merged.** `regress` on `main`: 42
  VERIFIED + 5 WITHDRAWN (verified by the lead designer at `e40d1af`).
  L1 cost 17.21 USD; **L2 cost 23.89 USD** (engineers 19.73, physics
  checker 2.82, reviewer 1.34). The reviewer found no blocking defect; its
  three findings are answered by #207 (life support under routing is fixed
  in the D pass, scenario D5).
- **The D pass** (`DESIGN.md` §13e, #206, #207, #212): PR #24 on
  `m0/d-damage`, head `36a3a1d`: D1–D4 PASS, `regress` 44 VERIFIED + 7
  WITHDRAWN; D5 FAILed on a tolerance the lead designer set under the
  kernel's Euler error (#212): withdrawn, successor D5b, plus a new
  `L2.blast.split` (D6). Fixes landed at head `4b754b1`: `regress` 46
  VERIFIED + 8 WITHDRAWN, `verify L2` exit 0 (verified by the lead
  designer). Physics checker: no blocking finding (#214). Reviewer
  `session_01TVQqxMbuhGDobwni8xCnqq` running. **The L3 plan is written** (`DESIGN.md` §13f, #208–#211);
  L3 starts after the D pass merges.
- **Heat is physical (#200, the owner)**: fast heat only along the
  machinery's coolant loop; crew rooms and magazines insulated and cooled
  by life support, which keeps running in a shut-down powered room (#201,
  #205). Heat sink built (#198); cofferdam deferred (#201 (4)).
- **Sense check closed (#202, #203, the owner)**: engines are self-fuelled
  torches; beams are millimetre-wave masers; recoil kept, measured at L3;
  real round sizes, partial kinetic damage and repair of damaged cells only
  in the **D pass** (#206, `DESIGN.md` §13e), built after L2 merges.
- **E1 (#188, #200)**: a scenario withdrawn for a specification error or
  superseded by an owner's decision, locked, recorded, listed in
  `mission0/withdrawn.json`, with a passing successor, does not block E1.
- **Approval tiers (#180, #191)**: the owner decides direction only; the
  lead designer decides and records everything technical (*LD* rows),
  merges after a clean review, and reports costs; 20 USD of sessions per
  level is a soft guideline (the owner is on a Max plan until the end of
  October); mention a level past about 40 USD.
- Roles (#167): lead designer (the chat with the owner), engineer (opus),
  reviewer and physics checker (sonnet; Fable is out of limit), each its own
  session (`.claude/agents/`).

## Open pull requests

| PR | Branch | State |
|---|---|---|
| #24 Mission 0 D pass | `m0/d-damage` → `main` | head `4b754b1`; physics checker done (#214); reviewer `session_01TVQqxMbuhGDobwni8xCnqq` running |

L2 merged into `main` by PR #22 (merge commit `72de1f2`).

## Decisions taken by the lead designer since the owner last read (for veto)

- #204: answers to the L2 heat-v2 engineer (two estimate errors of the
  lead designer; estimates now switch on every passed level's rules).
- #205: answers to the L2 physics checker (blast from the whole damaged
  region; heat-sink venting relative to rest; life support runs in a
  shut-down powered room; stale estimates corrected; L3 signal: life
  support loads the coolant loop).
- #214: answers to the D-pass physics checker (crew round per cell; the
  shield buffer's E4 stays open until L5; magazine size put to the owner).
- #212: answers to the D-pass engineer (D5 withdrawn for the lead
  designer's tolerance error, successor D5b; new `L2.blast.split`; blast
  kills crew in proportion; a destroyed cell resists no round, built at
  L3).
- #208–#211: the L3 plan (cell mass from heat capacity, rigid body,
  debris and fragments, control, validation, reference ship R1, 8
  scenarios with estimates; `engine.thrust` re-tuned 8 → 2 MN; new RCS,
  radiator-mass and specific-heat constants).
- #207: answers to the L2 reviewer (life support under power routing runs
  while the room is joined to a reactor able to produce, fixed in the D
  pass with scenario D5; §16 cleaned up); L2 merged.
- #206: the D pass specified (6 kg M rounds with every tied quantity
  scaled so L0–L2 ratios hold; three hits wreck a cell; repair of damaged
  cells only; the shield buffer now binds at the 6th round).

## Awaiting the owner

Nothing (the owner decided E8, #213, and the magazine wording, #215).

## Next steps

1. **The D pass** (`DESIGN.md` §13e, #206): one engineer session (opus) on
   a new branch `m0/d-damage` from `main`; scenarios D1–D4 locked in their
   own commit before their first canonical run; L0/L1/L2 re-recorded with
   the new data and still passing; `L1.quarters.repair` and
   `L1.repair.breach` withdrawn as superseded by #203 with D2/D3 as
   successors; D5 (#207) adds life support under routing; any other
   verdict change is a finding, not a withdrawal;
   then the physics checker (blind) and the reviewer.
2. **L3** (`DESIGN.md` §13f, #208–#211), after the D pass merges: one
   engineer session (opus) on `m0/l3-ship` from `main`, with the whole
   §13f as its task; scenarios locked in their own commit; the engineer
   reproduces the estimates of #209 independently before the lock; then
   the physics checker (blind, §13f.1, §13f.2, §13f.4) and the reviewer.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |

| Check-in on the D-pass reviewer | `trig_015GvrFCeR8yKwvxLfTg97bC` | once, 2026-10-21 09:56 UTC | wakes the lead designer chat `session_013PTXKzyTQkpVaKYQyBhRP8` |

The lead designer's own check-ins (one-shot reminders that wake the chat
to read a finished session) **belong to the chat that made them** (#179):
the old chat's pending check-in was deleted at hand-over; the new chat
creates its own (`send_later`, 20–45 min after starting a session).

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
| Engineer, L1 fixes (#185, #187) | session_01TQvnSvo7qZzJ4HBuas89nY | opus-5-5 | 2.65 |
| Reviewer, L1 | session_01RYgtwmNTAS4VRWxefHDetg | sonnet-5-5 | 1.19 |
| Engineer, L1 review fixes (#189) | session_014jtbGrQdvSycQU8E6stAeY | opus-5-5 | 4.97 |
| Reviewer, L1 re-review | session_01GsfMyFUqaSXRsVGQhELH2U | sonnet-5-5 | 0.53 |
| Engineer, L2 rows 1–12 (PR #15) | session_0111ENvC2XXCj4tA5T9zTZQ7 | opus-5-5 | 11.48 |
| Engineer, L2 heat v2 and heat sink | session_011dfRdXfFAYsLmAY2C9a6Qg | opus-5-5 | 8.25 |
| Physics checker, L2 | session_01KdLbYYddDJgStcfriEdqsv | sonnet-5-5 | 2.82 |
| Reviewer, L2 | session_01AKKABP9PxiAjtEkN1wcowa | sonnet-5-5 | 1.34 |
| Engineer, D pass (PR #24) | session_012PgbFfMKtgaDjSpVz451eZ | opus-5-5 | 7.83 |
| Engineer, D-pass fixes (#212) | session_01VgbfDLKbvp1rTyfbnxLcNd | opus-5-5 | 2.93 |
| Physics checker, D pass | session_01UFe2RUu58iTgEttPPf5dZ4 | sonnet-5-5 | 2.26 |
| Reviewer, D pass | session_01TVQqxMbuhGDobwni8xCnqq | sonnet-5-5 | running |

L1 total: 17.21 USD (engineer 14.27, physics checker 1.22, reviews 1.72).
L2 total: 23.89 USD (engineers 19.73, physics checker 2.82, reviewer 1.34).

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
- Write a scenario's expected result from the physics before writing the
  criterion: `L1.radiator.steady` failed because the lead designer's run
  length was under two time constants. A one-line estimate (τ = C / (4 n
  εσA T³)) would have caught it.
- Engineers' branches go stale against `main` while docs land: the lead
  designer merges a level by merging the level branch into its own branch
  and opening one pull request, resolving `STATUS.md` conflicts there.
- Estimate every expected result over the **whole run with every rule of
  every passed level switched on** (#204): two L2 criteria failed and two
  rows carried wrong estimates because an estimate stopped early or left
  an L1 rule out.
- Sense-check every new mechanic against real magnitudes before it is
  locked (#200, #202): the first heat model passed its tests and was still
  about 160 times too harsh.
- Check every tolerance against the kernel's own step error before
  locking it (#212: D5's 1e-6 K sat under a 5e-5 K Euler error; #201 (2)
  was the same mistake). Absolute temperature tolerances below 1e-4 K are
  suspect.
- `node tools/m0.js regress` takes several minutes since L2: give it a long
  timeout or run it in the background.
- Documentation changes go through a pull request from the lead
  designer's branch, merged at once (the session pushes only to its own
  branch).
- A check-in made with `send_later` fires into the chat that made it, not
  into a new chat: re-create check-ins after a hand-over.
