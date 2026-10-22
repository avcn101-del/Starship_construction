# STATUS — hand-over between chats (#179)

Updated 2026-10-22 by the lead designer chat
`session_01VL5M5dKNeREUVf7y1y3P87` (took over from
`session_014nrUDvPgiLEjm64scJFkyW` at the L4 block boundary, #247 (2); that chat took over from `session_01Ld11QmhkPubc8PkfKtd7CT`). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## For the owner (five lines, kept at every block, #246 (5))

- **Merged**: prototype v2 (#239), the audits block (#240–#244), the
  consolidation (#242), physics pass 2 (#243–#251), `tools/mutate` (#257),
  L4a (PR #58, #253–#258, #260), **L4b (PR #62, #261–#264, #267): L4 is
  done** (every capture route reaches Disabled; the cascade tree; E8
  0.15–0.29 ms per step), the audits' answers (#270), **the L4 fix round
  (PR #64, #272: the two-ship momentum book closes at 5e-15)**.
- **Running**: nothing. **The scenario-hygiene round is merged** (PR #67,
  #276: 20 scenarios, 19 withdrawn and frozen; every number verified by the
  blind checker; 15.89 USD against raw 10–15). The full mutation run on the
  merge runs in the lead designer's chat (#270 (5)).
- **Waiting on you**: nothing. The five questions (#273) and #83 (#274:
  a magazine explosion is a blast, not a destroyer) are decided. Veto window on #253, #256,
  #258–#263, #265, #267 (its cost-factor clause is withdrawn by #270),
  #270–#272. The prototype page is on the L4b kernel (version 5: R1d by
  default, the cascade tree on the end panel): play it and say what is not
  fun (#223's ladder).
- **Money**: 2026-10-21/22 about 150 USD (v2 13.85, audits 25.40,
  consolidation 4.12, pass 2 42.93, mutate 7.91, L4a ≥ 17.57, L4b 23.98,
  audits before L5 6.91, L4 fix 6.83, hygiene 15.89), about 166 in all.
  L4 in all ≥ 64.27 (#191: past 40).
- **Next**: merge PR #64 when its reviewer reports, then the **L5 plan**
  under the plan gate: `sensors.js` and the knowledge model first (#266);
  missiles, point defence and the railgun as room physics (#268, §13m);
  the enemy of §9; the kinetic-damage pass and R1d in one pace study (§17
  items 34, 41); room size S (item 30); ship versus ship and the reference
  battle of E7. Expect two passes (L5a senses and weapons, L5b enemy and
  ship versus ship), each costed with #246 (4)'s factor beside the lead
  designer's expectation (#270 (2)).
- **Not built yet** (§13m, #275; what the kernel cannot do, so you are not
  surprised by a prototype): missiles (seekers, warheads, EMP), point
  defence, the railgun as a weapon, round types, the firing window, every
  sense (passive, active, jamming, the knowledge model), the enemy's
  choices, standing orders and presets, the economy, the campaign, sound
  and rendering. All planned L5 or after Mission 0; the line shrinks as
  passes merge.
- **Owner chose** #261 (R1d the pace lever) and #252 (L4: one target per route; EMP and surrender at L5).
  The owner played v2: the magazine always wins in 7.1 s (#254). Pace
  study done: a 0.2 m citadel gives broadside 224–289 s, mostly captures.
  The owner chose armour on walls and Disabled without thrust (#255);
  plates on walls only, not decks (#256).

## Where we are

- Design settled: `DECISIONS.md` #1–#268, current design in `DESIGN.md`,
  decisions in force in its §18, open obligations in its §17.
- **Mission 0 L0–L4 are merged**, with the D pass, the mass pass, the path
  model, physics pass 2, `tools/mutate`, the armour plates (L4a), the L4
  fix round (#272) and the scenario-hygiene round (#276). `regress` on the
  hygiene merge: **109 VERIFIED + 106 WITHDRAWN + 5 RETIRED**.
- The feel prototype (`proto/`, throwaway, #217) runs on the L4b kernel at
  https://claude.ai/artifact/31syZz4vmCGXFw2bR3TQ9d (version 5): R1d by
  default, the cascade tree on the end panel; the enemy is a fixed script,
  not an AI (§13j.2), so the player wins by throughput; the owner's phone
  replays MATCH (#263).
- **What L5 must build before any ship-versus-ship measure** (#265, #266,
  #268): `sensors.js` and the knowledge model; missiles, point defence and
  the railgun as room physics; the enemy of DESIGN §9; the kinetic-damage
  pass (§17 item 34) and R1d in one pace study; room size S decided (item
  30).
- Approval tiers (#180, #191): the owner decides direction; the lead
  designer decides and records everything technical (*LD* rows); 20 USD
  of sessions per level is a soft guideline, a level past about 40 USD is
  mentioned; cost estimates carry the factors of #246 (4) (×2.5, ×4 for
  a new kind of work; #267's change withdrawn by #270), shown beside the
  lead designer's own expectation, with the ratio table in `LEDGER.md`.
- Roles (#167, #247): lead designer, engineer (opus), reviewer and physics
  checker (sonnet), auditor (sonnet), the owner's design partner.

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

- Nothing: the five questions (#273) and #83 (#274) are decided.
- Veto window on #253, #256, #258–#263, #265, #267, #270–#272, #274 is yours.

## Next steps

1. **Replace this chat** (#247 (2)): its context was compressed once and
   the block (L4 and its rounds) is closed; the new lead designer chat
   starts from this file and writes the L5 plan.
2. **The L5 plan** (a new section of `DESIGN.md` §13 after §13m, the plan gate of #241 with #270 (3)'s
   three checklist lines; `tools/estimates/l5.mjs`): L5a senses
   (`sensors.js`, the knowledge model, numbers for the information law) and
   weapons (missiles, seekers, warheads, point defence, the railgun, round
   types, the firing window); L5b the enemy (`enemy.js`, `helm.js`,
   standing orders and presets), ship versus ship, the reference battle of
   E5–E7, the kinetic-damage pass with R1d in one pace study; room size S;
   §13m updated in the plan's commit; the owner's five answers folded in.
3. Each L5 pass: engineer (opus) → blind physics checker → reviewer →
   answers row → merge; the full mutation run after the review (#270 (5)).

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
