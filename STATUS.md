# STATUS — hand-over between chats (#179)

Updated 2026-10-22 by the lead designer chat
`session_014nrUDvPgiLEjm64scJFkyW` (took over from
`session_01Ld11QmhkPubc8PkfKtd7CT` at the pass-2 boundary, #247 (2)). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## For the owner (five lines, kept at every block, #246 (5))

- **Merged**: prototype v2 (#239), the audits block (#240–#244), the
  consolidation (#242), physics pass 2 (#243–#251), `tools/mutate` (#257),
  **L4a (PR #58, #253–#258, #260)**: armour plates on walls, R1c, crew
  capacity, the kernel obligations.
- **Running**: nothing. L4a cost ≥ 17.57 USD (estimated 45–70).
- **Waiting on you**: **the pace lever** (frame in the chat, #260): A R1d
  (turret plated, 215–306 s broadside; recommended), B `turret.fireRate`
  0.25, C `kinetic.hitsToWreck`. Then the phone test: play one duel on the
  republished prototype page, Export, Copy, send the JSON (the lead
  designer replays it in Node; §17 item 23). Veto window on #253, #256,
  #258, #259, #260.
- **Money**: 2026-10-21/22 about 112 USD (v2 13.85, audits 25.40,
  consolidation 4.12, pass 2 42.93, mutate 7.91, L4a ≥ 17.57); L4a was
  estimated 45–70.
- **Next**: the owner's pace choice → the L4b plan (§13l; adds A11, the
  `l4f.plate.cellVentsPlate` case, NB2's fallback, R1d if chosen; 70–100
  USD estimated, probably high) → L4b.
- **Owner chose** #252 (L4: one target per route; EMP and surrender at L5).
  The owner played v2: the magazine always wins in 7.1 s (#254). Pace
  study done: a 0.2 m citadel gives broadside 224–289 s, mostly captures.
  The owner chose armour on walls and Disabled without thrust (#255);
  plates on walls only, not decks (#256).

## Where we are

- Design settled: `DECISIONS.md` #1–#236, current design in `DESIGN.md`.
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
- **The path model is done and merged** (`DESIGN.md` §13i; #228–#236;
  PR #48): rounds are damaged and flatten, protection is the mass on the
  path, the beam is a spinal neutral particle beam (Bethe deposit, no
  falloff). `regress` on `main`: **57 VERIFIED + 34 WITHDRAWN**. Cost
  18.24 USD.
- **Prototype v2 is planned** (`DESIGN.md` §13j, #237): a helm as three
  standing orders run by a stand-in autopilot, physical misses, the path
  model's kernel, a seed per Restart, the three superseded constants
  removed. The owner said go; the engineer runs on `proto/v2`
  (`session_013XH7jici9kFqQf6EJYqURu`, opus); the plan's docs are PR #50.
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

The audits block (#240–#244 and the consolidation) merged by PR #53 (`f68185a`; PR #52 closes with it); `regress`: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED.

The prototype v2 block merged by PR #50 (`8116e8d`; PR #51 closes with it); `regress` on the merge: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED.

The mass pass merged through the lead designer's branch (PR #40 closes with it).

L3 merged through the lead designer's branch (PR #35 closes with it).

The D pass merged by PR #32 (`ea4e96f`).

L2 merged into `main` by PR #22 (merge commit `72de1f2`).

## Decisions taken by the lead designer since the owner last read (for veto)

- #251: physics pass 2 merged; answers to the re-review.
- #250: pass 2's fix rounds; every withdrawn record frozen; answers to the
  reviewer; sessions notify the lead designer when done.
- #249 is the owner's (beam depth tier-invariant for electronic stopping only).
- #248: pass 2's first run; S6 withdrawn as the lead designer's error;
  the engineer's twelve withdrawals accepted; answers.
- #247 is the owner's (design partner, chat replacement, decision frame).
- #246: prevention after the audits (lint, mutation tool, the supersedes
  rule, ×4, this block for the owner). #245 is the owner's.
- #242: the documents consolidated and merged; the kinetic velocity rule
  decided (relative to the hull) on the reviewer's blocking finding.
- #244: answers to the scenario audit (S17–S22 and the conventions added
  to §13k; #236's 'eight reasons' struck; Q4-1 resolved with the full
  history).
- #243: physics pass 2 planned (§13k), the first plan under #241's gate.
- #241: process after the audits (plan gate, sessions, checker only on
  kernel physics, documents split). #240 is the owner's.
- #239: prototype v2 merged; answers to its engineer and reviewer; the
  lead designer's §13j.3 estimate was wrong by its own facing rule.
- #238: audits at fixed milestones (the owner's direction; the milestones
  and the four audits' scope are the lead designer's wording, §13b).
- #237: prototype v2's plan (§13j): kernel numbers first (R1 850 t, 1.80
  g; 5 / 11 / 31 m of dodge over the time of flight at 600 / 900 / 1500 m;
  R1's magazine open from three sides); the helm as standing orders, the
  facing trade (bow-on beams, broadside dodges) from the spinal bay and the
  axial engine with no constant; no dispersion; five withdrawn L0
  scenarios retired when the superseded constants go.
- #236: the path model merged; answers to its engineer, reviewer and
  physics checker; findings for the next kernel pass.
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

- Veto window on #253, #256.

## Next steps

1. **Prototype v2 is merged (#239)** and published for the owner
   (https://claude.ai/artifact/31syZz4vmCGXFw2bR3TQ9d, head `4fba090`):
   the owner plays it with a changing seed and the player's orders
   (range, facing, dodge) and writes down what is not fun (§13j.4).
2. **Audits (#238, §13b)**: documents done (`audit/docs`, 72 findings:
   9 contradictions, 28 stale, 4 unsupported, 22 single-place, 9
   questions; six questions are the owner's: no dice vs seeded stand-ins,
   blast and shield exempt from the mass law, heat capacity against
   steel's, range band vs ship lengths, the outside blast field); physics
   as one system (`audit/physics`) and scenario quality
   (`audit/scenarios`) run now; the process audit is the lead designer's own, from this file's
   ledger, once the docs audit is in. Then one consolidation pass answering
   every finding, recorded as a decision (DESIGN keeps the current design
   and a table of decisions in force; plans and measured history move to
   their own file; DECISIONS untouched), before the L4 plan. Milestones for
   the next audits are in §13b.
3. **Next kernel pass** (with L4): the findings of #236 (the `beamPaths`
   cache, withdrawal reason texts, a PSTAR water anchor for `csdaRange`,
   §13f.1's dead-weight flows), #227 Q9, the chord rule of §13j.2 and
   whatever v2's autopilot teaches `helm.js`.
4. Then the L4 plan (ship versus static target). Physics is frozen unless a
   playtest of prototype v2 points at it.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |

The lead designer's own check-ins (one-shot reminders that wake the chat
to read a finished session) **belong to the chat that made them** (#179):
the old chat's pending check-in was deleted at hand-over; the new chat
creates its own (`send_later`, 20–45 min after starting a session).

Sessions and costs (the sessions table, the per-level totals and the usage-limit note) are in `LEDGER.md`.

## When this chat is replaced (#247 (2))

At a block boundary (a pass merged, the next not planned) or as soon as
this chat's context is compressed or it repeats itself. Hand over through
this file; the new chat re-creates the check-ins (`send_later`), which die
with the chat that made them. The next natural boundary: **after physics
pass 2 merges.** The owner's design partner (#247 (1)) is a separate chat
and is not replaced with this one.

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
- Before locking a mechanic, sense-check the **hardware it implies**, not
  only its effect: #229 chose 400 MeV without checking that a real linac
  needs 20–100 m for it (#234). When one constant changes scale (the mass
  pass), re-derive every constant calibrated on the old scale (#232).
- When the owner plays a build, first check that a lever can act before
  the battle ends; a fixed seed decided every battle of v1 (#233).
- `create_session` inherits the chat's model: pass `model` explicitly for
  every role (an engineer created on fable by mistake cost 1.12 USD in
  35 s before it was archived).
