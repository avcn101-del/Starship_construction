# STATUS — hand-over between chats (#179)

Updated 2026-10-23 by the lead designer chat
`session_01S8gXf1kch2FCFHYE8nwhrn` at **L5d's merge**, handing over to a new
lead designer chat by the owner's standing instruction (#247 (2)); **the new
chat writes its own id here first thing**. Chain:
`session_01Ld11QmhkPubc8PkfKtd7CT` → `session_014nrUDvPgiLEjm64scJFkyW` →
`session_01VL5M5dKNeREUVf7y1y3P87` → `session_01DFw3o4EBEtf1adcpyJ5786` →
`session_01S8gXf1kch2FCFHYE8nwhrn` → **`session_01Bt5RVRLCv85dFpXLq4qB5W`**
(the current lead designer chat, took over 2026-10-23 at L5d's merge;
sessions notify it with `persistent_session_id` = this id). Read this first, then `CLAUDE.md`,
`DESIGN.md` and the newest rows of `DECISIONS.md`.

## For the owner (five lines, kept at every block, #246 (5))

- **Merged**: prototype v2 (#239), the audits block (#240–#244), the
  consolidation (#242), physics pass 2 (#243–#251), `tools/mutate` (#257),
  L4a (PR #58, #253–#258, #260), **L4b (PR #62, #261–#264, #267): L4 is
  done** (every capture route reaches Disabled; the cascade tree; E8
  0.15–0.29 ms per step), the audits' answers (#270), **the L4 fix round
  (PR #64, #272: the two-ship momentum book closes at 5e-15)**, **L5a the kinetic pass (PR #73, #278, #282, #283)**: a passed cell loses by its chord, a magazine detonates when a round enters it at 400 m/s or more, its explosion is a blast (on R1 it wrecks the reactor, which ends the ship), one magazine per weapon type, unmanned rooms, the two-ship energy and angular books. **L5m the turret by its mount (PR #78, #285–#287)**: an M turret weighs 19.9 t (a 7.9 t gun mount), an M round passes it; mission kill is shown on R1d, overheat through R1's bridge. **L5b the senses and the knowledge model (PR #84, #289, #290)**: `js/sensors.js`, the antenna fitting, passive IR/EM at d⁻², zones scanned at d⁴ revealing their own cells, one knowledge model per side as a battle setting; S1–S9 all PASS, every literal reproduced blind. **L5c weapons (PR #88, #295, #296, #298, #299)**: the railgun, missiles with seekers and warheads (EMP by section), point defence with a range, the round types with their prices, the firing window, S footprints; 39.06 USD. **L5d the helm and the enemy (PR #94, #301–#309)**: the symmetric loop, `js/helm.js` (twelve standing orders, presets, range, style, the lead, surrender, escape), `js/enemy.js` (personality, wildcard draw, surrender, disengage), `tools/play.mjs` and `tools/duel.js`; H1–H20; ≥ 47.92 USD.
- **Running** (2026-10-24 04:40 Vietnam time): the full `tools/mutate.js --jobs 4` run on a detached worktree `../wt-mutate` pinned to `761e5e4` (`main` after #311 plus the `SERIAL` fix, #312), in this chat's container, about 2–5 hours; the first run on `67fc38b` was stopped as contaminated (#312). Merged this block: PR #97 (det-math, #311, 5.04 USD) and **PR #96, the prototype page on the L5d loop (#312, 7.45 USD)**.
- **Waiting on you**: **permission to republish the prototype page** to the artifact: the Artifact publish was refused twice by the auto-mode classifier ("Data Exfiltration"); the files are built in the scratchpad (#312). Veto window on #253, #256, #258–#263, #265, #267 (its cost-factor clause is withdrawn by #270), #270–#272, #278, #280–#299, #301–#309.
- **Money**: L5a 23.54 USD (ratio 1.74 on raw), L5m 15.09 (1.21), L5b 11.62 (0.65), L5c 39.06 (1.18), **L5d ≥ 47.92 (≥ 1.20)**: L5 so far ≥ 137.23. 2026-10-21/23 in all about 304 USD of sessions (the lead designer chats' own cost is not counted, #270 (7)).
- **Money (before L5)**: 2026-10-21/22 about 150 USD (v2 13.85, audits 25.40,
  consolidation 4.12, pass 2 42.93, mutate 7.91, L4a ≥ 17.57, L4b 23.98,
  audits before L5 6.91, L4 fix 6.83, hygiene 15.89), about 166 in all.
  L4 in all ≥ 64.27 (#191: past 40).
- **Next**: (1) the full mutation run on L5d's merge and its row; (2) **the prototype page on the L5d kernel** (#301 (5), option A approved: an engineer session `proto/l5d`, a reviewer, the lead designer's republish with the Artifact tool; expected 6–8 USD); (3) **L5e's plan** (ship versus ship, E5–E7, the plume, the Cold Brick #305, the rows #309 moved, §17 items 35, 43, 48–50), under the plan gate with a probe and a frame to you on its cost.
- **Pace (information, §17 item 49)**: on the L5d loop R1d-A duels end in 23–107 s (25.08 s with Fire's defaults at 900 m, 20 hits of 20), against E7's 3–6 minutes: an L5e question, and what the owner will see first on the prototype page.
- **Not built yet** (§13m, #275; what the kernel cannot do, so you are not
  surprised by a prototype): ship versus ship measured (E5–E7, L5e), the
  plume (L5e), the automatic rules *reactor containment first* and *dark
  fragments* (moved to L5e by #309), the economy, the campaign, sound and
  rendering. The helm, the enemy, standing orders, presets, escape and
  surrender exist in the kernel since L5d. The prototype page is still
  **version 6 on the L5c kernel** with the fixed script; step (2) above
  rebuilds it on the L5d kernel with an enemy that decides.
- **Owner chose** #261 (R1d the pace lever) and #252 (L4: one target per route; EMP and surrender at L5).
  The owner played v2: the magazine always wins in 7.1 s (#254). Pace
  study done: a 0.2 m citadel gives broadside 224–289 s, mostly captures.
  The owner chose armour on walls and Disabled without thrust (#255);
  plates on walls only, not decks (#256).

## Where we are

- Design settled: `DECISIONS.md` #1–#309, current design in `DESIGN.md`,
  decisions in force in its §18, open obligations in its §17.
- **Mission 0 L0–L4 are merged, and L5a, L5m, L5b, L5c and L5d of L5**.
  `regress` on L5d's merge: 161 VERIFIED + 145 WITHDRAWN + 5 RETIRED; after `m0/det-math` (#311): **161 VERIFIED + 146 WITHDRAWN + 5 RETIRED**.
- The feel prototype (`proto/`, throwaway, #217) runs on the L5c kernel at
  https://claude.ai/artifact/31syZz4vmCGXFw2bR3TQ9d (version 6, `main`
  `c1b2c4a`; the page's own label still says feel-5): R1d by
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
| — | — | none: PR #94 (L5d) merged with the lead designer's documentation pull request from `ld/l5d` |

The audits block (#240–#244 and the consolidation) merged by PR #53 (`f68185a`; PR #52 closes with it); `regress`: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED.

The prototype v2 block merged by PR #50 (`8116e8d`; PR #51 closes with it); `regress` on the merge: 57 VERIFIED + 29 WITHDRAWN + 5 RETIRED.

The mass pass merged through the lead designer's branch (PR #40 closes with it).

L3 merged through the lead designer's branch (PR #35 closes with it).

The D pass merged by PR #32 (`ea4e96f`).

L2 merged into `main` by PR #22 (merge commit `72de1f2`).

## Decisions taken by the lead designer since the owner last read (for veto)

- #301–#309: L5d's probe and plan amendment, the engineer's three questions (#302, #303, #307–#308), the radiators' correction and the Cold Brick (#304, #305), the answers (#306), the merge (#309, three coverage rows moved to L5e).

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

1. **The full mutation run** (running on `../wt-mutate` at `761e5e4`, #312): its report in `mission0/mutations/2026-10-2x-761e5e4.txt` and its row (the next number after #312).
2. **Republish the prototype page** once the owner allows it (#312): build `proto/` with `js/` and `mission0/targets.js` beside it, `../js/` and `../mission0/` rewritten to `./`; read the artifact first. PR #96 is merged. (Done before: **the prototype page on the L5d kernel** (#301 (5), the owner's option A, already approved, expected 6–8 USD): one engineer session (opus, branch `proto/l5d` from `main`) replaces `proto/battle.js`'s own loop by the kernel's symmetric loop: the player's side by the page's three verbs (scan a zone of the silhouette, target a known room, switch preset), the enemy by `enemy.js` at personality 0.5; the page draws the enemy as the player's model knows it (the owner's battle-screen layout C in `IDEAS.md` is the later presentation, not this task); both ships R1d-A; `proto/replay.mjs` through `tools/duel.js`'s inputs; `proto/smoke.mjs` with zero console errors; then a reviewer; then the lead designer republishes the page with the Artifact tool to https://claude.ai/artifact/31syZz4vmCGXFw2bR3TQ9d (copy `js/` beside the proto files, the import prefix `../js/` rewritten to `./js/`, `proto.css` as a file). Tell the owner first that Fire's defaults end a duel in about 25 s (§17 item 49).)
3. **L5e's plan** (§13n.1 (e), the plan gate #241 / #275, a probe first, #285): E5–E7 with `tools/sweep.mjs`, the plume (#297, #304), the Cold Brick (#305), the automatic rules and the wildcard's case moved by #309, §17 items 35, 43, 48, 49, 50; a frame to the owner on its cost.
4. Due when their files are touched: §17 items 35, 39, 43, 44–50.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main` with plain git, runs `node tools/m0.js regress` and `verify`, reports read-only; push notification to the owner |

**No timed check-ins** (the owner's rule, 2026-10-23): every session the
lead designer creates notifies it by a one-shot trigger when done; the
design partner cannot create triggers, so its pushes arrive through the
owner's message. This chat left no pending check-in.

Sessions and costs (the sessions table, the per-level totals and the usage-limit note) are in `LEDGER.md`.

## When this chat is replaced (#247 (2))

At a block boundary (a pass merged, the next not planned) or as soon as
this chat's context is compressed or it repeats itself. Hand over through
this file; the new chat re-creates the check-ins (`send_later`), which die
with the chat that made them. **Handed over at L5d's merge** (2026-10-23, the owner's standing
instruction below). The previous chat (`session_01S8gXf1kch2FCFHYE8nwhrn`)
leaves nothing running and no pending check-in. The next natural boundary:
after the prototype page and L5e's plan, or earlier if the new chat's
context is compressed.

**The owner's standing instruction (2026-10-23) for this chat
(`session_01S8gXf1kch2FCFHYE8nwhrn`)**: right after L5d merges, hand over
to a new lead designer chat, no change before. (1) Write this file for it:
open PRs, running sessions, scheduled tasks, next steps; the next step is
**the prototype page session** (#301, option A, already approved). (2) Open
the new chat on **`claude-opus-5-5`**, the whole task in its first message.
**Lead designer chats are opened on opus**: fable kept stopping on safety
grounds in this project (several of this chat's turns on
`claude-fable-5-1` were withheld by a safety classifier). (3) Delete this
chat's own pending check-ins; the new chat re-creates its own. (4) The last
act: tell the owner the new chat's link. Hand over earlier only if the
context is compressed or the chat repeats itself; then also tell every
running session where to send its trigger (the new chat's id).
**The owner is in Vietnam: give times in Vietnam time (UTC+7).**
**The owner's rule (2026-10-23): sessions notify the lead designer when
they finish, by their one-shot trigger into its chat; the lead designer
does not arm timed check-ins (`send_later`).** Every session's first
message ends with that notification (the chat's id from this header); the
new chat's first message says so.

## Lessons for whoever continues

- **`tools/mutate.js` copies the live working tree at each mutation** (#312): never change branch or merge in the tree it runs from; run it on a detached worktree pinned to the commit it measures. And never run `regress`, `run`, `determinism` or `proto/smoke.mjs` in the same container while it runs: the determinism duel serves Chromium on the fixed port 8738.
- **Cross-engine determinism needs every implementation-approximated `Math` member out of the kernel** (#310, #311): `Math.atan2`, `cbrt`, `exp`, `log` differ in the last bits between Node and Chromium; `L0.determinism.v2` greps for them.

- **Check every §13m row a plan assigns to a pass against its scenario list before the engineer starts** (#309): three rows (containment first, dark fragments, the wildcard's case) were on L5d in §13m and in §13n.6's checklist with no H-row; found only at the merge and moved to L5e.
- **A fix round costs more when the lead designer's laws are wrong** (#302, #303, #306, #307): four control-law or wording errors of the lead designer, each caught by the engineer before a lock, turned one fix round into three (13.24 USD against 6–10 raw). Run a candidate law on the kernel from the case's own starting state before writing it (the probe tools: `createBattle` and a few lines, as `tools/estimates/l5.mjs` section (11) does).

- **The design partner cannot create triggers** (its role forbids it): its pushes reach the lead designer through the owner's message, not a notification; do not ask it for one.

- **Test a control law against the case's own starting state before writing it into a plan** (#302, #303): the L5d engineer found within an hour that #301's range-order threshold never engages from rest and that #278's surrender formula contradicted its own gloss. Both were caught before the lock because the engineer asked early by message; keep inviting that.

- **Commit `tools/mutations.json` (and anything in `js`, `tools` or `mission0/scenarios`) before the canonical runs** (#290): the L5b records carry `a1174e7+dirty` because the mutation entries were uncommitted while the records were written; the results are right, the stamp is not clean.
- **A probe that moves no locked row still pays for itself** (#289): it found that a zone revealing whole rooms would have contradicted S2, that S9 as written could not resolve a shield, and where an antenna can sit on R1d, before the engineer started; L5b landed at 0.65 of its raw estimate.
- **One chat per pass is about right** (this hand-over): L5b, its probe and its answers cost this chat about 350k tokens of context, L5c about 350k more; a pass with two fix rounds (L5c) reads every PR body and review in full. Hand over at the boundary, not inside a pass.
- **A fix round whose task names a kernel change must say so in its file list** (#298): fix round 2 could not build W9b because the loop drives one bay and `js/` was off its list; it stopped rightly. Decide the kernel question before the round, or allow the change.
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
