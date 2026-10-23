# STATUS — hand-over between chats (#179)

Updated 2026-10-23 by the lead designer chat
`session_01DFw3o4EBEtf1adcpyJ5786`, which **took over** from
`session_01VL5M5dKNeREUVf7y1y3P87` at the L5a/L5m block boundary (#247 (2))
to run L5b. Chain: `session_01Ld11QmhkPubc8PkfKtd7CT`
→ `session_014nrUDvPgiLEjm64scJFkyW` → `session_01VL5M5dKNeREUVf7y1y3P87` →
`session_01DFw3o4EBEtf1adcpyJ5786` (this chat; sessions notify it with
`persistent_session_id` = this id). Read this
first, then `CLAUDE.md`, `DESIGN.md` and the newest rows of `DECISIONS.md`.

## For the owner (five lines, kept at every block, #246 (5))

- **Merged**: prototype v2 (#239), the audits block (#240–#244), the
  consolidation (#242), physics pass 2 (#243–#251), `tools/mutate` (#257),
  L4a (PR #58, #253–#258, #260), **L4b (PR #62, #261–#264, #267): L4 is
  done** (every capture route reaches Disabled; the cascade tree; E8
  0.15–0.29 ms per step), the audits' answers (#270), **the L4 fix round
  (PR #64, #272: the two-ship momentum book closes at 5e-15)**, **L5a the kinetic pass (PR #73, #278, #282, #283)**: a passed cell loses by its chord, a magazine detonates when a round enters it at 400 m/s or more, its explosion is a blast (on R1 it wrecks the reactor, which ends the ship), one magazine per weapon type, unmanned rooms, the two-ship energy and angular books. **L5m the turret by its mount (PR #78, #285–#287)**: an M turret weighs 19.9 t (a 7.9 t gun mount), an M round passes it; mission kill is shown on R1d, overheat through R1's bridge. **L5b the senses and the knowledge model (PR #84, #289, #290)**: `js/sensors.js`, the antenna fitting, passive IR/EM at d⁻², zones scanned at d⁴ revealing their own cells, one knowledge model per side as a battle setting; S1–S9 all PASS, every literal reproduced blind. **L5c weapons (PR #88, #295, #296, #298, #299)**: the railgun, missiles with seekers and warheads (EMP by section), point defence with a range, the round types with their prices, the firing window, S footprints; 39.06 USD.
- **Running**: the full `tools/mutate.js` run on the L5c merge (in the lead designer's chat, 1.5–3 hours); its row follows.
- **Waiting on you**: (1) **the go for L5d** (the helm and the enemy, `tools/play.mjs`, escape #293, the EMP route #292, the bay's power test: 104–144 USD by the rule, 36–51 expected, before the plan is re-costed after its probe); (2) **L5c merged is a block boundary** (#247 (2)): this chat continues into L5d unless you say otherwise (its context is still far from compressed). Veto window on #253, #256, #258–#263, #265, #267 (its cost-factor clause is withdrawn by #270), #270–#272, #278, #280–#299.
- **Money**: L5a 23.54 USD (ratio 1.74 on raw), L5m 15.09 (1.21), L5b 11.62 (0.65), **L5c 39.06 (1.18)**: L5 so far 89.31. 2026-10-21/23 in all about 256 USD.
- **Money (before L5)**: 2026-10-21/22 about 150 USD (v2 13.85, audits 25.40,
  consolidation 4.12, pass 2 42.93, mutate 7.91, L4a ≥ 17.57, L4b 23.98,
  audits before L5 6.91, L4 fix 6.83, hygiene 15.89), about 166 in all.
  L4 in all ≥ 64.27 (#191: past 40).
- **Next**: **L5d the helm and the enemy** (§13n.1 (d), H1–H11, `tools/play.mjs`; the items L5b and L5c left it: §17 items 45, 46) on your go: the plan re-read and probed first, then engineer → blind checker (H4, H8–H11) → reviewer → answers row → merge; then L5e ship versus ship with `tools/sweep.mjs`, the plume (#297), the saturation measure (#299). Cost: L5d 104–144 by the rule, 36–51 expected; L5 in all 421–598 by the rule, 150–228 expected (89.31 spent).
- **Not built yet** (§13m, #275; what the kernel cannot do, so you are not
  surprised by a prototype): the enemy's choices and the helm's orders (the
  knowledge model and the weapons exist; nothing decides with them yet),
  standing orders and presets, escape, the plume, the economy, the
  campaign, sound and rendering. All planned L5d–L5e (§13n) or after
  Mission 0. The prototype page (version 5) still runs on the L4b kernel;
  a republish (no session, 0 USD) is all it needs.
- **Owner chose** #261 (R1d the pace lever) and #252 (L4: one target per route; EMP and surrender at L5).
  The owner played v2: the magazine always wins in 7.1 s (#254). Pace
  study done: a 0.2 m citadel gives broadside 224–289 s, mostly captures.
  The owner chose armour on walls and Disabled without thrust (#255);
  plates on walls only, not decks (#256).

## Where we are

- Design settled: `DECISIONS.md` #1–#268, current design in `DESIGN.md`,
  decisions in force in its §18, open obligations in its §17.
- **Mission 0 L0–L4 are merged, and L5a, L5m and L5b of L5**, with the D pass, the mass pass, the path
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

1. **L5c is merged** (#299); the full mutation run on the merge runs in the lead designer's chat and gets its own row (as #284, #288, #294).
2. **L5d** needs the owner's go (#277 O5). Before any session the lead designer re-reads §13n.1 (d) with #292 (the EMP route), #293 (escape, H11), §17 items 45 (what L5b and L5c left: plan advancement by the model, partial power, `roundEm`, every bay by orders), 46 (the bay's power test and draw) and probes the symmetric loop in a scratch copy (#285's lesson: H1 replays every L4b case on it; which records move); re-costs if the probe disagrees with §13n.5 (raw 26–36).
3. **Open for the owner later**: the republish of the prototype page on the current kernel (0 USD); phone play against a deciding enemy after L5d (the page republished reading `enemy.js`, to be added to L5d's plan).
4. Due when their files are touched: §17 items 35 (rest, L5d), 39 (residue), 43 (L5e's throughput measure), 44 (k = 0 reads), 45–47 (L5b's and L5c's leftovers).

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |

The lead designer's own check-ins (one-shot reminders that wake the chat
to read a finished session) **belong to the chat that made them** (#179):
the old chat's pending check-in was deleted at hand-over; the new chat
creates its own (`send_later`, 20–45 min after starting a session). This
chat has no pending check-in (the L5c reviewer's fired at 09:04 UTC after the review was posted).

Sessions and costs (the sessions table, the per-level totals and the usage-limit note) are in `LEDGER.md`.

## When this chat is replaced (#247 (2))

At a block boundary (a pass merged, the next not planned) or as soon as
this chat's context is compressed or it repeats itself. Hand over through
this file; the new chat re-creates the check-ins (`send_later`), which die
with the chat that made them. **L5c is merged: this is a boundary.** This
chat (`session_01DFw3o4EBEtf1adcpyJ5786`) has no pending check-in; its only
running work is the full mutation run on the L5c merge, whose row the chat
that reads the report writes. The owner decides whether it continues into
L5d (the lead designer proposes to continue: its context is far from
compressed).

## Lessons for whoever continues

- **Commit `tools/mutations.json` (and anything in `js`, `tools` or `mission0/scenarios`) before the canonical runs** (#290): the L5b records carry `a1174e7+dirty` because the mutation entries were uncommitted while the records were written; the results are right, the stamp is not clean.
- **A probe that moves no locked row still pays for itself** (#289): it found that a zone revealing whole rooms would have contradicted S2, that S9 as written could not resolve a shield, and where an antenna can sit on R1d, before the engineer started; L5b landed at 0.65 of its raw estimate.
- **Write the expected count of a scenario from the kernel's own cadence, not from the estimate's window** (#296, #299): the plan's "six missiles over 2.6 s, 4 and 5 killed" assumed a point-defence window the rule did not have and a launch cadence the bay does not have; two fix rounds later the Swarm's law is an L5e measure. An estimate's number that depends on a mechanism not yet in the kernel is a guess: label it, or build the mechanism first.
- **Count the regress tally before writing it in a task** (#298): the lead designer told the fix round to expect 141 VERIFIED; the right count was 140. Derive it as the engineer did (before − withdrawn + new).
- **Probe before costing a pass** (#285): apply the planned change in a
  scratch worktree, run `regress` there (nothing recorded), restore it,
  and count what fails and what moves. #281 costed "the turret only" at
  5–8 USD; the probe showed 15 failing scenarios, about twice the work.
- **A mass or constant change can change a route, not only literals**
  (#286): the light turret turned R1's mission kill into a magazine kill
  and T-gun's overheat into a burn-out. The engineer rightly built nothing
  for those three and asked; probe candidate targets with `createBattle`
  / `runBattle` before deciding.
- **The blind checker finds what the plan assumed away** (#282, #287): the
  reactor's immediate explosion at its last cell (undocumented since L1),
  the repair field slowing a beam's burn, the overheat route resting on an
  unsourced heat capacity. Give it the setup, never the expected numbers.
- **A check that passes whatever the code does** (#282 (7)): the reviewer
  caught K4's feed check; a mutant that SURVIVES is a gap until shown
  equivalent, not a "redundant guard" by default.
- **The design partner's documentation checks are worth reading at once**
  (#288): three numbers in a frame to the owner were wrong; re-run before
  accepting, and correct the row before writing it.
- Use the full 40-character sha for `expectedHeadSha` when merging.
- Session costs are in `get_session`'s `external_metadata.usage.cost_usd`;
  engineers cannot see their own cost.

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
