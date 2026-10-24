# STATUS — hand-over between chats (#179; process v2, #325)

Lead designer chat: **the new chat writes its own id here first thing.** Handed
over 2026-10-24 ~23:25 UTC by `session_01VnsqF6AQX456h5ihxqZjh5` at about 280k
tokens, after item 55's merge, while the item 58 probe runner works. **The new
chat is opened by the owner from claude.ai** (lineage depth 0): this chat was at
depth 7 of 8, and its children could not create triggers or sessions. Chain: `session_01Ld11QmhkPubc8PkfKtd7CT` →
`session_014nrUDvPgiLEjm64scJFkyW` → `session_01VL5M5dKNeREUVf7y1y3P87` →
`session_01DFw3o4EBEtf1adcpyJ5786` → `session_01S8gXf1kch2FCFHYE8nwhrn` →
`session_01Bt5RVRLCv85dFpXLq4qB5W` → `session_01EAtiqegHjnDwsoHwD7cjur` →
`session_01DJwKiaxa29KDtFqVjBviSe` → `session_01VnsqF6AQX456h5ihxqZjh5` → the new chat (sessions notify it with `persistent_session_id` = its id). Work branch: `ld/pace`.

**Reading order (#325)**: this file, `BRIEF.md`, `CLAUDE.md`,
`.claude/agents/lead-designer.md`, `DESIGN.md` §18 and the plan in force
(§13n, §13n.9, §17 items 57–58); `audits/2026-10-24-process.md` §1; everything
else on demand. The previous `STATUS.md` is the last section of `HISTORY.md`.

## For the owner (five lines)

- **Done**: §17 item 55 merged (PR #105, `da029d3`: the helm's layers, the broadside race cured, K1–K6; `regress` 179 VERIFIED + 160 WITHDRAWN + 5 RETIRED); the owner's rows #336–#338 (outcomes counted apart, the clock and the stalemate, the sweep's tie-break); #339 (item 55's answers, K6); ideas merged: room variants, the phases' gaps.
- **Next**: §17 item 58 (a starved engine latches the pilot's thrust at 0; the yield clocks' `RES`): probe, then a small pass, before the builds are locked; then the builds (PR #104, #330, #332); then the runner's baseline re-measure (with #336/#337's columns); then battle phases.
- **Waiting on you**: **the next lead designer chat must be opened by the owner from claude.ai**, not by this chat: this chat is at lineage depth 7 of 8; sessions it creates (depth 8) cannot create triggers or sessions (the checker's and the reviewer's notifications were refused), and a chat it created could not create engineers.
- **Money**: item 55's pass 16.39 USD (expected 11–17); this chat 8.65 USD at 278k tokens.
- **Running**: the item 58 probe runner `session_01YWf1ajvoEXsTuTsQYyJLuJ` (sonnet; latch counts, helm suites and `regress` under `tools/estimates/item58-a.diff` and `-b.diff`; it cannot notify: read its last assistant message with `list_events`, and tell it nothing unless it stalls). No check-in is scheduled. The builds engineer `session_01SC9bT7XzCShErTLAScXgUu` stands by on draft PR #104 (it continues after item 58).

Not built yet: §17 items 54 (beam term in the energy book), 56 (missile guidance), 57 (a leading navigator), 58 (the starved-thrust latch).

## Open pull requests

- **#104** (draft, `m0/builds2` → `ld/pace`): the builds' rebuild, stopped at #330's stop rule; its questions answered (#331, #332; the race was item 55, now merged). Continues after item 58 under #330 and #332 (retry without the S turret first), merging `ld/pace` first; re-run `tools/estimates/helm-suite.mjs` on the builds that get locked.

## Next steps

0. **Documentation to `main`** (#325 (7)): item 55's pass is done; one pull request `ld/pace` → `main` after `node tools/lint-docs.mjs` (not yet opened).
1. **§17 item 58** (`DESIGN.md` §17; PR #105's checker H1 and reviewer finding 1): a starved engine latches the pilot's reported thrust at 0 (refreshed only while asked to thrust; the navigator then never asks); and the yield's and reset's clocks compare without `RES` (`js/navigator.js` ~128, ~134). Probe first on a scratch tree (a runner): count the helm-suite cells where `lastSupply` stays 0 while the router could feed the engine, under (a) the fraction the router would give at full draw and (b) a starved report that expires after one step not asked; `regress` under the chosen one. Then a small engineer pass (opus) with a scenario that kills the latch (K2 is locked: a new one), the blind checker if the thrust rule changes, a reviewer. Item 55's probe and history: `HISTORY.md` and §13n.9.
2. **The builds** (#330): after item 58, the builds engineer (or a new one) continues PR #104 under #332 (retry without the S turret first). `L4.builds.lethal` is not yet written or locked.
3. **The owner's battle-phases direction** (2026-10-24, `IDEAS.md` from `ideas/battle-phases` `d0bffd5`; the owner's answer to #329's B): phases contact / range / position and control / finish, one side attacking and one defending, a defence sends the battle back a phase, tapping out open in every phase, each side judging its phase from its own model; a strategy is per phase a preset plus an exit condition at an aggression level; the player takes decision points from a short menu (auto by default). **When**: after item 55 and the rebuilt builds, before L5e2's E5–E7; the runner's re-measure below is the baseline without phases, the same measures with phases decide. Item 55 keeps the navigator's inputs as goals (range, aspect) set from above; a one-phase plan must reproduce the behaviour exactly. Record as an owner row when the phases pass is planned.
4. **One runner** (#329, the owner's process): on the new builds, the mirror and versus-R2 grids with `tools/estimates/pace-e7.mjs` (workers; `--pairs`) at 600 / 900 / 1500 m and 2500 m (`--cull2`), default and strafe + range open (seeds 1–4 where a side strafes or dodges), and `tools/estimates/pace-verbs.mjs --pairs Lance:R2,Swarm:R2,Furnace:R2 --ranges 900,1500 --times 0,10` (the verbs with the player losing). E7 is the two-sided line (#329). Then A / B to the owner. **Also report (the owner, #336, #337)**: outcomes counted apart (win / loss / escape / stalemate) with a survival column; the time to the first hot room per pair; in each battle that ends in a kill, the longest gap without a `cell-damaged` event (sets the stalemate's X, the lead designer's).
4b. **Before the phases plan** (the lead designer's, from `IDEAS.md` battle phases' gaps, `ideas/phase-gaps` `3973641`): gap 1 (a pursuing navigator: item 57's candidate), gap 3 (weapons tight on both sides; a stated opening), gap 4 (each exit condition named by model fields), gap 7 (phase roles for the builds against #330's lethality). The other gaps are risks to measure. The stalemate (#337) and outcomes counted apart (#336) are built in or before the phases pass, with the sweep's tie-break by survival (#338) in the same change to `tools/sweep.mjs`.
5. **L5e2** (E5–E8, W9b, `L5.route.throughput`, §17 item 54) after that.
6. Due when their files are touched: §17 items 47, 50, 51.

## Scheduled tasks

| Task | Id | Schedule | What |
|---|---|---|---|
| Nightly regression (#136) | `trig_01CYh11Bvh27MsTBUpEWyyWo` | 02:42 Asia/Ho_Chi_Minh, daily | a fresh session clones `main`, runs `node tools/m0.js regress` and `verify`, reports read-only |

No timed check-ins (the owner's rule): sessions notify by a one-shot trigger.

## When this chat is replaced (#322 (4))

At every block boundary or past about 350k tokens of context, whichever
comes first; always on opus, no model switch inside a chat; tell running
sessions the new id; the owner is told the new chat's link. The owner is in
Vietnam: times in Vietnam time (UTC+7).

## Lessons for whoever continues

- **Session lineage is capped at depth 8** (seen 2026-10-24): `get_session` on this chat shows `lineage: depth 7, limit 8`. Sessions it creates run but cannot create triggers or sessions, so they cannot notify; read them with `list_events` and use `send_later` check-ins. The next lead designer chat must be opened by the owner from claude.ai (depth 0), not created by this one.
- **A background command dies at 2 hours** (#314): split a full mutation run with `--only` into parts under that limit from the start; the tool writes its report only at the end.
- **The owner's L5e question is open** (2026-10-24): A (one pass) or B (L5e1 rules and tools, a pace study, then L5e2 measures; recommended), with the E7 probe: R1d-A mirror median 51 s, `kinetic.hitsToWreck` 8 gives about 131 s, `shield.budget` no effect; identical mirrors always end against A (the kernel's tie-break order).

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
