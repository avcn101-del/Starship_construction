# STATUS — hand-over between chats (#179; process v2, #325)

Lead designer chat: **`session_01DJwKiaxa29KDtFqVjBviSe`** (took over 2026-10-24
from `session_01EAtiqegHjnDwsoHwD7cjur`, which handed over at 370k tokens of
context inside the builds' rebuild, #322 (4)). Chain: `session_01Ld11QmhkPubc8PkfKtd7CT` →
`session_014nrUDvPgiLEjm64scJFkyW` → `session_01VL5M5dKNeREUVf7y1y3P87` →
`session_01DFw3o4EBEtf1adcpyJ5786` → `session_01S8gXf1kch2FCFHYE8nwhrn` →
`session_01Bt5RVRLCv85dFpXLq4qB5W` → `session_01EAtiqegHjnDwsoHwD7cjur` →
`session_01DJwKiaxa29KDtFqVjBviSe` (sessions notify it with `persistent_session_id` = its id). Work branch: `ld/pace`.

**Reading order (#325)**: this file, `BRIEF.md`, `CLAUDE.md`,
`.claude/agents/lead-designer.md`, `DESIGN.md` §18 and the plan in force
(§13n, §13n.8, §17 item 52); `audits/2026-10-24-process.md` §1; everything
else on demand. The previous `STATUS.md` is the last section of `HISTORY.md`.

## For the owner (five lines)

- **Done**: #326 (process), `battle.openingRange` 500–3000 m, the pace study (#328), §17 item 53 (#327), the owner's E7 answer (#329), the builds' criteria (#330), the rebuild's stop (#331).
- **Next**: fix the broadside mirror race (§17 item 55, a helm-law pass, probed first); then the builds again; then one runner re-measures E7 (two-sided), the shape and the verbs.
- **Waiting on you**: nothing (#332 answered the S turret: only after item 55, if still needed, at most one, recorded with and without).
- **Money**: this chat 13.16 USD; its sessions 14.80 (runners 1.25; item 53 6.95; the builds engineer ≥ 6.60, still open).
- **Running**: runner `session_01S9x8RHyzN6aW5YiUmiYCVn` (sonnet): the helm suite and `regress` under P3 (item 55); the builds engineer `session_01SC9bT7XzCShErTLAScXgUu` stands by on draft PR #104. Done: runners `session_0184EvFVAF3uPPJ8u6d9oyhb` (0.29 USD), `session_018CzG2efzqJLEh5utTmS1AX` (0.47), `session_01JEsqkpArJ9unCs6ng4gGCF` (0.39).

Not built yet: §17 items 54 (beam term in the energy book), 55 (the broadside race), 56 (missile guidance).

## Open pull requests

- **#104** (draft, `m0/builds2` → `ld/pace`): the builds' rebuild, stopped at #330's stop rule; its questions 4 and 5 answered in #331 (L beam bay yes; `cell-damaged` in (i)); 1 (S turret) answered by #332; 2 (the race) is item 55, the lead designer's; 3 (narrow (i) to bow) no: it would hide item 55.

## Next steps

1. **§17 item 55, the broadside mirror race.** Probe so far (2026-10-24, this chat): the scratch law L1 (`tools/estimates/pace-race-probe.diff`: the position's lead dropped after 15 s engaged without closing its point by a band, restored after 30 s let go) ends the Lance broadside mirror at 600 / 900 / 1500 m in 197–199 s on PR #104's builds (600 s unended before); a yield reset at let-go does not cure it (PAT 10–20 all cure; reset 30 s = never); R2's broadside mirror lengthens (41–67 s to 66–320 s: it now holds 900 m instead of racing at 480 m). `regress` under L1 (runner `session_0184EvFVAF3uPPJ8u6d9oyhb`): 9 MISMATCH, 3 no longer pass; all three trace to `L4.beam.nobody`, which pins one battle's step 9524 (R2 v Lance 600 m bow): under L1 A dies at step 3186; `L4.loop.symmetric` and `.v2` fail only because they replay it. Any helm change moves it: it needs a successor (#245). The design partner's helm behaviour suite (accepted): every candidate law on the whole duel grid at once, four properties (separation, race, spinal bearing, two-sided battles end); today vs L1 (runner): any property fails in 118 / 168 cells today, 102 under L1 (race 19 → 3; 17 fixed, 1 broken: Lance 600 m bow). The suite then showed two more helm defects: (H) at a heading error of exactly 180° the wanted heading's jitter flips the RCS bang-bang every few steps and the ship never turns to brake (mirrors pass through each other from bow openings); the position law reads the other ship's spinning heading while it turns or thrusts. Candidate **P2** = L1 + H + the lead only at range (|r − R*| ≤ band): on the 56 default cells race 0, separation 4 (16 failing any, 31 without L1); the remaining separation cells are Furnace with starved engines (the fire preset routes power to the engine last; `shipDynamics` ignores the engine's supply: a new §17 item). Full table and `regress` under P2 at the runner (`tools/estimates/pace-race-p2.diff`). **The owner's direction for the pass (2026-10-24, with the design partner)**: split the helm into layers: pilot (heading + throttle → RCS and engines, holdHeading; reports what the ship can do now: thrust with the engines' delivered power, turn rate), navigator (range, position, style, dodge, disengage → heading + throttle; tested alone by the suite; a later manual mode replaces only its output, recorded per step like a verb), gunnery and systems; details the lead designer's; nothing manual built (#323, #2). If P2 leaves cells failing, the next suite candidate is a navigator that leads the other ship's motion (as gunnery's intercept) and caps the relative speed (item 56 is the same class). To record as a decision row with the pass. **Full grid (runner)**: any property fails in 118 / 168 cells today, L1 102, P2 92 (separation 12 → 2, race 19 → 1; the race cell is Furnace:R2 900 bow orbit at 199 m/s against a cap computed at the start, R2 having lost mass; 7 cells fail under P2 that pass today, bearing at thresholds); `regress` under P2: 11 MISMATCH, 4 no longer pass: `L4.beam.nobody`, `L4.loop.symmetric` and `.v2` (they replay it) and `L4.sweep.determinism.v2` (its criterion pins that the 1500 m battle ends after the 600 m one; under P2 it ends first): both need successors (#245). **P3** = P2 + the pilot's thrust at the power its engines were last given (`tools/estimates/pace-race-p3.diff`): 56 default cells separation 0, race 0, 14 failing any (P2 16); full grid and `regress` at the runner. Probe a position law on a scratch copy of `js/helm.js` from the race's own start (Lance mirror, 900 m broadside: `node tools/estimates/pace-e7.mjs --pairs Lance:Lance --ranges 900 --openings broadside`), with every passed rule on, and run `regress` on the scratch tree (a runner). Two laws already failed (#331's row: yield while the other accelerates; give up after 10–20 s without closing). The cause, traced: both ships thrust along +x at 449 m apart, the relative error stays constant, the range order never lets go. Then an engineer pass (opus) with the blind checker (a control law) and a reviewer. Item 56 (proportional navigation for missiles) may go in the same pass, if probed.
2. **The builds** (#330): after item 55, the builds engineer (or a new one) continues PR #104 under #332 (retry without the S turret first). `L4.builds.lethal` is not yet written or locked.
3. **One runner** (#329, the owner's process): on the new builds, the mirror and versus-R2 grids with `tools/estimates/pace-e7.mjs` (workers; `--pairs`) at 600 / 900 / 1500 m and 2500 m (`--cull2`), default and strafe + range open (seeds 1–4 where a side strafes or dodges), and `tools/estimates/pace-verbs.mjs --pairs Lance:R2,Swarm:R2,Furnace:R2 --ranges 900,1500 --times 0,10` (the verbs with the player losing). E7 is the two-sided line (#329). Then A / B to the owner.
4. **L5e2** (E5–E8, W9b, `L5.route.throughput`, §17 item 54) after that.
5. Due when their files are touched: §17 items 47, 50, 51.

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
