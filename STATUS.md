# STATUS — hand-over between chats (#179)

Updated 2026-10-21 by the lead designer chat
`session_013PTXKzyTQkpVaKYQyBhRP8` (took over from
`session_01LozzrLAfpzaSd7wTt1AUec`). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## Where we are

- Design settled: `DECISIONS.md` #1–#207, current design in `DESIGN.md`.
- **Mission 0 L0, L1 and L2 done and merged.** `regress` on `main`: 42
  VERIFIED + 5 WITHDRAWN (verified by the lead designer at `e40d1af`).
  L1 cost 17.21 USD; **L2 cost 23.89 USD** (engineers 19.73, physics
  checker 2.82, reviewer 1.34). The reviewer found no blocking defect; its
  three findings are answered by #207 (life support under routing is fixed
  in the D pass, scenario D5).
- **Next: the D pass** (`DESIGN.md` §13e, #206, #207) on `m0/d-damage`.
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
| — | — | none open (L2 merged through the lead designer's branch; PR #15 closes with it) |

## Decisions taken by the lead designer since the owner last read (for veto)

- #204: answers to the L2 heat-v2 engineer (two estimate errors of the
  lead designer; estimates now switch on every passed level's rules).
- #205: answers to the L2 physics checker (blast from the whole damaged
  region; heat-sink venting relative to rest; life support runs in a
  shut-down powered room; stale estimates corrected; L3 signal: life
  support loads the coolant loop).
- #207: answers to the L2 reviewer (life support under power routing runs
  while the room is joined to a reactor able to produce, fixed in the D
  pass with scenario D5; §16 cleaned up); L2 merged.
- #206: the D pass specified (6 kg M rounds with every tied quantity
  scaled so L0–L2 ratios hold; three hits wreck a cell; repair of damaged
  cells only; the shield buffer now binds at the 6th round).

## Awaiting the owner

Nothing.

## Next steps

1. **The D pass** (`DESIGN.md` §13e, #206): one engineer session (opus) on
   a new branch `m0/d-damage` from `main`; scenarios D1–D4 locked in their
   own commit before their first canonical run; L0/L1/L2 re-recorded with
   the new data and still passing; `L1.quarters.repair` and
   `L1.repair.breach` withdrawn as superseded by #203 with D2/D3 as
   successors; D5 (#207) adds life support under routing; any other
   verdict change is a finding, not a withdrawal;
   then the physics checker (blind) and the reviewer.
2. **The L3 plan** (minimal ship): rigid body; cell mass = heat capacity /
   c_p, about 1 t per cell, a T1 corvette about 250 t (#202 E); engine
   thrust re-tuned for torches (#203 A); CoM and moment of inertia; recoil
   measured (#203 C; now 12× larger, about 0.35 °/s after 20 M shots);
   split momentum; the control graph; SCRAM in a fragment; validation; the
   L3 signal of #205 (8): radiator rooms must carry the heat life support
   pumps into the coolant loop. Estimate every criterion over its whole run
   with every rule of L0–L2 on before locking (#204).

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
- `node tools/m0.js regress` takes several minutes since L2: give it a long
  timeout or run it in the background.
- Documentation changes go through a pull request from the lead
  designer's branch, merged at once (the session pushes only to its own
  branch).
- A check-in made with `send_later` fires into the chat that made it, not
  into a new chat: re-create check-ins after a hand-over.
