# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat
`session_013PTXKzyTQkpVaKYQyBhRP8` (took over from
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#235, current design in `DESIGN.md`.
- **Mission 0 L0, L1 and L2 done and merged.** `regress` at L2's merge: 42
  VERIFIED + 5 WITHDRAWN (verified by the lead designer at `e40d1af`).
  L1 cost 17.21 USD; **L2 cost 23.89 USD** (engineers 19.73, physics
  checker 2.82, reviewer 1.34). The reviewer found no blocking defect; its
  three findings are answered by #207 (life support under routing is fixed
  in the D pass, scenario D5).
- **The D pass is done and merged** (`DESIGN.md` §13e; #206, #207, #212,
  #214, #216): 6 kg rounds, partial damage, repair of damaged cells only,
  life support under routing. `regress` on `main`: **46 VERIFIED + 8
  WITHDRAWN**. Cost 14.11 USD (engineers 10.76, physics checker 2.26,
  reviewer 1.09).
- **If play is not fun** (#223, the owner): tune constants, then combine
  the existing physics, only then change a law.
- **Ships get real density (#221, the owner)**: 10 t per cell instead of
  1 t, heat unchanged; built as the mass pass after L3.
- **L3, the minimal ship, is done and merged** (`DESIGN.md` §13f;
  #208–#213, #216, #219, #220, #222): rigid body, thrust, RCS, recoil,
  debris and fragments, control and SCRAM, validation. `regress` on
  `main`: **55 VERIFIED + 15 WITHDRAWN**. Cost 23.82 USD.
- **The mass pass is done and merged** (`DESIGN.md` §13g; #221, #222,
  #225): 10 t per cell, thrust 15 MN, RCS 1 MN; R1 448 t, 3.41 g, a 90°
  turn in 3.68 s, 0.04 °/s per M shot. `regress` on `main`: **56 VERIFIED
  + 20 WITHDRAWN**. Cost 8.90 USD.
- **The feel prototype is published** (private page
  https://claude.ai/artifact/31syZz4vmCGXFw2bR3TQ9d, PR #42 on `proto/feel`,
  head `c1282d8`): an R1 duel ends in about 11 s (#227); loadout panel and
  Export / replay built. A light reviewer checks #217's rules.
- **The path model** (#228, the owner's principle: every interaction
  symmetric, no correction factors): the lead designer is rebuilding the
  terminal effects of rounds, beams, missiles and fragments on it, every
  number checked against real materials; the owner approved it (#229,
  #230): rounds are damaged and flatten, the beam is a neutral particle
  beam with no falloff at battle range, tumble waits with sloped armour in
  `IDEAS.md`. Plan and scenarios P1–P8: `DESIGN.md` §13i (#231); the
  engineer builds it on `m0/path`.
- **Heat is physical (#200, the owner)**: fast heat only along the
  machinery's coolant loop; crew rooms and magazines insulated and cooled
  by life support, which keeps running in a shut-down powered room (#201,
  #205). Heat sink built (#198); cofferdam deferred (#201 (4)).
- **Sense check closed (#202, #203, the owner)**: engines are self-fuelled
  torches; beams are millimetre-wave masers; recoil kept, measured at L3;
  real round sizes, partial kinetic damage and repair of damaged cells only
  in the **D pass** (#206, `DESIGN.md` §13e), now merged.
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
| #48 Path model | `m0/path` → `main` | head `07e20ec`; all P1–P10 PASS, regress 57 VERIFIED + 34 WITHDRAWN; physics checker `session_01PsqTHfLh2EPTgKeY3KroeR` and reviewer `session_01D2L2Kyg1bin1QGk1UZQvfW` (sonnet) running; check-in `trig_01CwVR487CnaBr52C2utBmwp` 17:06 UTC |

The mass pass merged through the lead designer's branch (PR #40 closes with it).

L3 merged through the lead designer's branch (PR #35 closes with it).

The D pass merged by PR #32 (`ea4e96f`).

L2 merged into `main` by PR #22 (merge commit `72de1f2`).

## Decisions taken by the lead designer since the owner last read (for veto)

- #204: answers to the L2 heat-v2 engineer (two estimate errors of the
  lead designer; estimates now switch on every passed level's rules).
- #205: answers to the L2 physics checker (blast from the whole damaged
  region; heat-sink venting relative to rest; life support runs in a
  shut-down powered room; stale estimates corrected; L3 signal: life
  support loads the coolant loop).
- #227: the prototype's first build and answers to its engineer.
- #225: answers to the mass-pass engineer and reviewer; a split room
  keeps one heat store; the mass pass merged.
- #224: the feel prototype's plan (§13h).
- #222: answers to the L3 reviewer (three untested rules get a scenario in
  the mass pass; control needs a working bridge); L3 merged.
- #220: answers to the L3 physics checker and Q13 (angular books
  1e-9 × net + 1e-12 × gross; crew capacity at L4; ship density to settle
  before the prototype).
- #219: answers to the L3 engineer (shield generator may carry fittings;
  seven L3 scenarios withdrawn as specification errors, five of them the
  engineer's invariant scales, two the lead designer's criteria; v2
  successors).
- #218: one documentation pull request per working block; small fix
  rounds get the reviewer only.
- #216: answers to the D-pass reviewer (two #207 clauses get L3 cases;
  blast capacity counts remaining integrity from L4); the D pass merged.
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

Nothing (the owner chose the spinal beam bay and low-end masses, #234).

## Next steps

1. **Prototype v1 play is paused** (#233: fixed seed, no lever acts before
   11 s).
2. **The path model** (§13i revised, #235): the paused engineer resumes; then
   a blind physics checker and the reviewer; merge; then prototype v2 (a
   helm, physical misses, the path model, a seed per Restart).
3. **When the path model merges, remind the owner to start a new chat**
   (the owner asked, 2026-10-21; this chat's context was compressed once).
   Hand over through this file; delete this chat's pending check-ins.
4. Then the L4 plan (ship versus static target). Physics is frozen after
   the path model unless a playtest of prototype v2 points at it.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |


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
| Reviewer, D pass | session_01TVQqxMbuhGDobwni8xCnqq | sonnet-5-5 | 1.09 |
| Engineer, L3 (PR #35) | session_01LapPHkFEVnX7ADLbgrCENH | opus-5-5 | 13.09 |
| Physics checker, L3 | session_014dyKkuWtmsZa9fcmrS8jkp | sonnet-5-5 | 3.22 |
| Engineer, L3 fixes 1 (#219, stopped on Q13) | session_016VbwLzzv4YyZZL383cPXbx | opus-5-5 | 2.94 |
| Engineer, L3 fixes 2 (#219, #220) | session_01AQ4WNuYgQLBevpeWC2HZku | opus-5-5 | 3.12 |
| Reviewer, L3 | session_01WR2QvB555iEiVuoLRBQS7A | sonnet-5-5 | 1.45 |
| Engineer, mass pass (PR #40) | session_019smwJw2FbuFFrWfmYWTDmz | opus-5-5 | 8.07 |
| Reviewer, mass pass | session_012AUgxm8yu3YHzVQ5gLjGC9 | sonnet-5-5 | 0.83 |
| Engineer, feel prototype | session_011PcMxJ4ydx4kZctZb2Gefn | opus-5-5 | 5.41 |
| Engineer, prototype loadout | session_013115n9cwYfUvYMg8ij5ed4 | opus-5-5 | 3.71 |
| Engineer, prototype export and replay | session_01D3M6QwPL2KWFkX1Scsi4fd | opus-5-5 | 2.93 |
| Reviewer, feel prototype (PR #42) | session_01FHeYxhXNqrCLrjyT1kpwia | sonnet-5-5 | 0.31 |
| Engineer, path model (PR #48) | session_01GVBq5ohYZDDfg15HAkHm71 | opus-5-5 | 13.57 |

L1 total: 17.21 USD (engineer 14.27, physics checker 1.22, reviews 1.72).
L2 total: 23.89 USD (engineers 19.73, physics checker 2.82, reviewer 1.34).
D pass total: 14.11 USD (engineers 7.83 + 2.93, physics checker 2.26, reviewer 1.09).
L3 total: 23.82 USD (engineers 13.09 + 2.94 + 3.12, physics checker 3.22, reviewer 1.45).
Mass pass total: 8.90 USD (engineer 8.07, reviewer 0.83).
Feel prototype total: 12.36 USD (engineers 5.41 + 3.71 + 2.93, reviewer 0.31).
Path model so far: 13.57 USD (engineer).

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
- Before locking, compare every criterion with the plan's own estimate
  output, and size every invariant against float resolution (#219: the
  lead designer repeated #212's tolerance error in the L3 plan and wrote
  a 295.01 K bound its own estimate contradicted).
- Check every tolerance against the kernel's own step error before
  locking it (#212: D5's 1e-6 K sat under a 5e-5 K Euler error; #201 (2)
  was the same mistake). Absolute temperature tolerances below 1e-4 K are
  suspect.
- `node tools/m0.js regress` takes several minutes since L2: give it a long
  timeout or run it in the background.
- Documentation changes go through **one** pull request per working
  block from the lead designer's branch (#218), merged at once (the session pushes only to its own
  branch).
- A check-in made with `send_later` fires into the chat that made it, not
  into a new chat: re-create check-ins after a hand-over.
