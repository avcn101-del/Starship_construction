# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat (session
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this first, then `CLAUDE.md`,
`DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#206, current design in `DESIGN.md`.
- **Sense check closed (#203, the owner)**: engines are self-fuelled
  torches, beams are millimetre-wave masers, recoil is kept but expected to
  matter only for the spinal railgun, kinetic damage and repair get the D
  pass before L3.
- **L2 in progress** (#192–#201, `DESIGN.md` §13d): PR #15 on
  `m0/l2-clusters` built rows 1–12: 10 PASS, 2 FAIL on the lead designer's
  own specification errors (#201 (2)). Engineer cost 11.48 USD.
- **Heat now makes physical sense (#200, the owner)**: heat moves fast only
  along the machinery's coolant loop; crewed rooms and magazines are
  insulated and cooled by life support (#201). The heat sink stays (#198);
  the cofferdam is deferred (#201 (4)). Superseded scenarios are withdrawn
  under #188 as extended by #200.
- **Sense check of all mechanics (#202)**: four inconsistencies for the
  owner (engines, beams, recoil, kinetic damage and repair) and two fixed
  by the lead designer (cell mass = heat capacity / c_p, about 1 t per cell;
  relative velocity checked at L5).
- **E1 amended by the owner (#188)**: a scenario withdrawn for a
  specification error, with a passing successor, does not block E1.
- **Mission 0 L0 (materials) done and merged**: 12 scenarios, all locked
  before their first run, all PASS, VERIFIED by independent reviewer and
  physics-checker sessions; 12/12 VERIFIED on `main` (`node tools/m0.js
  regress`).
- **Mission 0 L1 (one room alone) done and merged** (PR #5, head
  `fd815ce`, 2026-10-21): 16 scenarios, each locked before its first run;
  15 PASS and `L1.radiator.steady` WITHDRAWN for a specification error
  (#185, #188), replaced by `L1.radiator.steady.v2`. Checked by a blind
  physics checker and two reviews; every blocking finding fixed (#185–#190).
  `regress` on `main`: **27 VERIFIED + 1 WITHDRAWN**. L1 cost **17.2 USD**.
- **Approval tiers (#180)**: the owner decides direction; the lead designer
  decides and records everything technical (*LD* rows), reports it here,
  and merges after a clean review. Spending: 20 USD of sessions per level
  is a soft guideline, not a cap (#191: the owner is on a Max plan until
  the end of October); every cost is reported here. Documentation-only
  commits by the lead designer go straight to `main`.
- **L1 plan approved** (#181–#184, `DESIGN.md` §13c): nine rooms, the
  per-room heat model, 13 scenarios, constants with ranges.
- Roles (#167): lead designer (the chat with the owner), engineer,
  reviewer, physics checker, each its own session (`.claude/agents/`).

## Open pull requests

| PR | Branch | State |
|---|---|---|
| #15 Mission 0, L2: pairs and clusters | `m0/l2-clusters` → `main` | head `e40d1af`: #200/#201 and the heat sink landed; `regress` 42 VERIFIED + 5 WITHDRAWN (verified by the lead designer); answers in #204; physics checker: all 15 matched blind, no blocking finding, 9 notes answered in #205; reviewer `session_01AKKABP9PxiAjtEkN1wcowa` running |

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
- #189: answers to the reviewer (two kernel and tool fixes that block the
  merge, two new scenarios `L1.repair.breach` and `L1.room.restart`, and
  five small fixes).
- #190: the engineer's three readings of #189 accepted (a cell stays
  destroyed until fully repaired; the bridge's radiators in the restart
  test are a fixture; turret rate sweeps must avoid shot times).
- #192–#196: the L2 plan (layout and live walls, the flow models, 12
  scenarios with reference integrators where no closed form exists,
  7 constants with ranges, process).
- #198, #199: the heat sink (5× capacity, 3× conductivity, a destroyed
  cell vents its heat to space) and the cofferdam (1×N, the hold's
  factors; deferred by #201).
- #201: the coolant-loop rules and constants, life support, the L2 v2
  scenarios, the cofferdam deferred, the answers to the L2 engineer.
- #202 (E, F): cell mass and heat capacity from one number at L3 (about
  1 t per cell, a T1 corvette about 250 t); relative velocity checked at L5.

## Awaiting the owner

Nothing. The owner approved the four sense-check proposals (#203 A–D).

## Next steps

1. The reviewer on PR #15's final head; fixes if blocking; the lead
   designer merges when no blocking finding remains (#180).
3. **The D pass** (#203 D), specified in `DESIGN.md` §13e and #206: 6 kg M
   rounds with every tied quantity scaled so L0–L2 ratios hold, partial
   kinetic damage (three hits wreck a cell), repair of damaged cells only;
   scenarios D1–D4; an engineer on `m0/d-damage` after L2 merges.
4. Then the L3 plan (minimal ship: rigid body, cell mass = heat capacity /
   c_p (#202 E), engine thrust re-tuned for torches (#203 A), CoM, MoI,
   recoil measured (#203 C), split momentum, control graph, SCRAM in a
   fragment, validation).

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
| Engineer, L1 fixes (#185, #187) | session_01TQvnSvo7qZzJ4HBuas89nY | opus-5-5 | 2.65 |
| Reviewer, L1 | session_01RYgtwmNTAS4VRWxefHDetg | sonnet-5-5 | 1.19 |
| Engineer, L1 review fixes (#189) | session_014jtbGrQdvSycQU8E6stAeY | opus-5-5 | 4.97 |
| Reviewer, L1 re-review | session_01GsfMyFUqaSXRsVGQhELH2U | sonnet-5-5 | 0.53 |
| Engineer, L2 rows 1–12 (PR #15) | session_0111ENvC2XXCj4tA5T9zTZQ7 | opus-5-5 | 11.48 |
| Engineer, L2 heat v2 and heat sink | session_011dfRdXfFAYsLmAY2C9a6Qg | opus-5-5 | 8.25 |
| Physics checker, L2 | session_01KdLbYYddDJgStcfriEdqsv | sonnet-5-5 | 2.82 |
| Reviewer, L2 | session_01AKKABP9PxiAjtEkN1wcowa | sonnet-5-5 | running |

L1 total: 17.21 USD (engineer 14.27, physics checker 1.22, reviews 1.72).

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
