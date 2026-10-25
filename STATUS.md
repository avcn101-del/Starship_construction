# STATUS — hand-over between chats (#179; process v2, #325)

Lead designer chat: **`session_01Gv71ygXtVy9Maao1eGSMvh`** (from 2026-10-25 08:37 UTC, 15:37 Vietnam time;
lineage depth 2 of 8). Handed over 2026-10-25 ~08:35 UTC by
`session_01TVhwYJYiLwnTj5Z2D53m5s` at about 300k tokens at a block boundary (the owner's choice).
Chain: `session_01Ld11QmhkPubc8PkfKtd7CT` →
`session_014nrUDvPgiLEjm64scJFkyW` → `session_01VL5M5dKNeREUVf7y1y3P87` →
`session_01DFw3o4EBEtf1adcpyJ5786` → `session_01S8gXf1kch2FCFHYE8nwhrn` →
`session_01Bt5RVRLCv85dFpXLq4qB5W` → `session_01EAtiqegHjnDwsoHwD7cjur` →
`session_01DJwKiaxa29KDtFqVjBviSe` → `session_01VnsqF6AQX456h5ihxqZjh5` → `session_01JNPQjwzYdLB7Uz1qfWt5GC` → `session_01TVhwYJYiLwnTj5Z2D53m5s` → `session_01Gv71ygXtVy9Maao1eGSMvh` (sessions notify it with `persistent_session_id` = its id). Work branch: `ld/pace`.

**Reading order (#325)**: this file, `BRIEF.md`, `CLAUDE.md`,
`.claude/agents/lead-designer.md`, `DESIGN.md` §18 and the plan in force
(§13n, §13n.9, §13n.10, §17 items 56–58, rows #340–#345); `audits/2026-10-24-process.md` §1; everything
else on demand. The previous `STATUS.md` is the last section of `HISTORY.md`.

## For the owner (five lines)

- **Done**: **PR #107 merged** (§17 item 58; answers #350; 9.58 USD, expected 6–11); #346 (phases gaps 1, 3, 4 probed: no pursuing navigator, contact weapons tight at range open, exit on zones / no antenna / own damage); the owner's #347 (a designed preset menu in the phases plan; #348 how) and #349 (verb leverage as save and error rates); the owner's cost ranges given in chat (rough).
- **Next**: the builds' lock (PR #104; the builds engineer told); the tools pass (#342 (3), with #348's `--menu`, #349's rates, `item58.res.reset`); the baseline; gap 7 and the menu after the builds' lock; then the phases plan §13n.12.
- **Waiting on you**: nothing (#343 open to your veto).
- **Money**: item 58 9.58 USD (probe runners 0.92 more); the previous chat 12.42 final; this chat 7.11 USD at 297k tokens.
- **Running**: tools pass PR #109 (head `586e72c`; engineer `session_01TzbKXyt9GyhDDQBpTZF7oJ` done; Q1 answered: the crew key moved U2's set, the plan's probe had left it out) under reviewer `session_01TM3zBb2opbnyeZRdQkyS3i` (sonnet, from 11:10 UTC); builds engineer `session_01SC9bT7XzCShErTLAScXgUu` done: PR #104 locked and ready (head `119f4b1`; `L4.builds.lethal`, `.valid.v2` PASS; regress 182 + 161 + 5, 0 FAIL); its reviewer `session_014S4FXk73yUxDhDuhFssNAW` (sonnet, from 10:26 UTC). Reviewer and item 58 engineer done (idle).

**PR #108** (`ld/pace` → `main`) merged `f9da7aa`.

Not built yet: §17 items 54 (beam term in the energy book), 56 (missile guidance; waits, #342), 57 (two pilots on one relative variable; not the phases' pursuit, #346).

## Open pull requests

- **#107** merged into `ld/pace` (`01b9332`; answers #350); `regress` there by runner `session_01KiJGgyop4Zg1PSS7wBGg1J`: 181 VERIFIED + 160 WITHDRAWN + 5 RETIRED, 0 FAIL / MISMATCH / BLOCKED.
- **#104** merged into `ld/pace` (`ec26788`; answers #359; reviewer 0 blocking, 5 non-blocking); `regress` on the merge by runner `session_018oPP5pmnkb2TYVPGq2fuG5`: 182 VERIFIED + 161 WITHDRAWN + 5 RETIRED, 0 FAIL; lint passes.
- **#109** (`m0/tools` → `ld/pace`): the tools pass, head `586e72c`, under review; after #104's merge it must merge `ld/pace` and re-record `L4.sweep.determinism.v2` (both PRs moved it) and whatever replays it.

## Next steps

0. **Documentation to `main`** (#325 (7)): item 58's pass merged to `main` (PR #108, `f9da7aa`); the next one after the builds' lock or the tools pass.
1. **§17 item 58**: merged (#350), `regress` matched; the builds engineer told to merge and lock (2026-10-25 06:50 UTC).
2. **The builds** (#330, #332, #342): the builds engineer `session_01SC9bT7XzCShErTLAScXgUu` resumes PR #104 now (retry without the S turret first; the Swarm may aim at saturating point defence, `tools/estimates/swarm-pd.mjs`); before `L4.builds.lethal` locks it merges `ld/pace` with item 58 and re-checks #330's (i), (ii) and the helm suite. `L4.builds.lethal` is not yet written or locked.
2b. **The baseline's columns** (#342 (3)): a small tools pass (engineer) puts #336's outcomes counted apart (win / loss / escape / none by the limit; stalemate once #337's X is set), the survival column, #338's ranking (wins, survival, crew alive) and #337's columns (time to the first hot room; the longest gap without `cell-damaged` in battles ending in a kill) into `tools/sweep.mjs`, `tools/estimates/pace-e7.mjs` and `pace-verbs.mjs`, before the baseline runner; planned after item 58's merge. Also (#348): `pace-verbs.mjs --menu prototype|designed` and the verb column's label "on the prototype's three presets, not a designed menu" (#347). And (#349) verb leverage as a save rate and an error rate, per pair and in total, with cell and trial counts.
3. **The owner's battle-phases direction** (2026-10-24, `IDEAS.md` from `ideas/battle-phases` `d0bffd5`; the owner's answer to #329's B): phases contact / range / position and control / finish, one side attacking and one defending, a defence sends the battle back a phase, tapping out open in every phase, each side judging its phase from its own model; a strategy is per phase a preset plus an exit condition at an aggression level; the player takes decision points from a short menu (auto by default). **When**: after item 55 and the rebuilt builds, before L5e2's E5–E7; the runner's re-measure below is the baseline without phases, the same measures with phases decide. Item 55 keeps the navigator's inputs as goals (range, aspect) set from above; a one-phase plan must reproduce the behaviour exactly. Record as an owner row when the phases pass is planned.
4. **The reduced baseline** (#357; one runner, after PR #104 and the tools pass merge): the locked builds ship versus ship, both the standard enemy on today's orders only (no strafe, no range-open variant, no verb column), `tools/estimates/pace-e7.mjs` on the mirror and versus-R2 pairs at 600 / 900 / 1500 m and 2500 m (`--cull2`), both openings, seed 1 (the seed acts only through dodging, #328). Reports: outcomes counted apart with survival (#336), the first hot room per pair (#337 (A)), the longest quiet gap from the first cell damage in battles ending in a kill (sets #337's X). Not a like-for-like reference: the "without phases" reference is the one-phase plan on the designed menu, inside the phases pass.
4a. **The tools pass (#342 (3))**, planned as §13n.11 (#351); its engineer next (opus): #336's outcomes counted apart, the survival column, #338's ranking, #337's two columns in `tools/sweep.mjs`, `pace-e7.mjs`, `pace-verbs.mjs`; #348's `--menu prototype|designed` and #347's label; #349's save and error rates with cell and trial counts; #350's `item58.res.reset` mutation. Write its task as a short §13n subsection first (no kernel change: no physics checker).
4e. **Order after the builds' lock (#358)**: gap 7 read (#363: no range attacker among the four; a position attacker by turn margin against Lance, measured in §13n.12) ∥ §13n.12 (with the probe of the four candidate slots) → the chosen slots built (the phases pass's first stage) → #348's derivation, one sweep on the final slots with #353's break-off → the one-phase and with-phases measures on the designed menu (#357). The reduced baseline (step 4) runs once PR #104 and PR #109 merge, independent of this chain.
4d. **The audit (#355, #356)**: from §13n.12 on every plan's checklist has the player-decisions item; §13n.11 amended (mirror cells apart; lint checks 11, 12; the tools engineer told to merge `ld/pace`); E7 default today 56.6 s (stale numbers until the baseline); what rests on the decision layer is re-measured with the designed menu.
4c. **Postures (#352, the owner)**: `IDEAS.md` "Postures from scarce resources" merged (`ideas/postures` `698d18c`); the frame of the designed menu before #348's derivation. Next: the lead designer's probe of its four gaps (the throttle is already an order field that `helm.override` reaches, so a sweep slot needs no kernel change; which weapons fire, a defences target class and the shield's budget need `js/helm.js`), then which enter the phases plan; map the admissible postures to slot sets per locked build. The owner's questions decided: #353 (break off always on the menu; strike colours after Mission 0), #354 (the stand-off default).
4b. **Gaps 1, 3, 4 probed and decided (#346)**: no pursuing navigator (an escape at equal acceleration is physics); contact = weapons tight (`openFire: tight`) at range open from 1500 or 2500 m; exit = zones, or no antenna left, or own ship damaged. Next for the phases plan: gap 7 and the designed preset menu (#347, #348: a runner's sweep per locked build) after the builds' lock, then §13n.12 with its estimate script.
   **The phases plan, now** (#341, the owner 2026-10-25: in parallel with the builds; gap 7 and every phases measure after the builds lock). The design partner's probe (`IDEAS.md`, "Probe: a contact phase held at range", merged fast-forward `908ea20`) was re-run by the lead designer on `d80cf84`, the 126 battles: counts match (two-sided 27 → 18; both commit 22, 16 end at 169–324 s, median 227 s; by opening 1 / 13 / 8 of 14; both antennas ruined at 65.9 s in the R2 mirror 900 m bow); small differences: the first release 5.5–13.4 s later (it says 8–13), the later commit 116–190 s (it says 111–190). A reading on old builds, one seed: input to gaps 3 and 4, not a measure. **Before the phases plan** (the lead designer's, from `IDEAS.md` battle phases' gaps, `ideas/phase-gaps` `3973641`): gap 1 (a pursuing navigator: item 57's candidate), gap 3 (weapons tight on both sides; a stated opening), gap 4 (each exit condition named by model fields), gap 7 (phase roles for the builds against #330's lethality). The other gaps are risks to measure. The stalemate (#337) and outcomes counted apart (#336) are built in or before the phases pass, with the sweep's tie-break by survival (#338) in the same change to `tools/sweep.mjs`.
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

- **A background wait that dies takes its children with it** (2026-10-25): a probe batch started with `nohup ... &` inside a foreground command that hit its timeout stopped at 24 of 168 battles. Start long batches as the `run_in_background` command itself, with a long timeout.
- **A container restart kills a session's background jobs** (PR #107's reviewer, 05:28 UTC): two mutations were lost and re-run; ask for split runs so a restart costs one part.
- **`mission0/builds.js` has two name spaces**: the module exports `LANCE`, `SWARM`, `FURNACE`; `BUILDS` keys are `Lance`, `Swarm`, `Furnace`. A probe that mixes them crashes every battle.

- **Re-run a trace before writing it into a row** (#345): #343 carried the engineer's "the rest burns front cells" mechanism; no Furnace mirror cell shows it (two M shields absorb the beam whole). The owner and the design partner caught it in minutes with one script.
- **Probe a fix on the case's own extreme state, not only on the suite** (#340): candidate (b) cured the latch on all 168 suite battles but chattered every second step under sustained starvation (K7's setup, 300 asks in 10 s); only the constructed case showed it.
- **A clock's hand count includes its start step** (K8, PR #107): the patience clock starts at E + 1, so the yield lands at E + 901, not E + 900; the engineer caught the plan's literal before the lock.
- A chat created by the lead designer at depth 0 is at depth 1: its children notify normally.

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
