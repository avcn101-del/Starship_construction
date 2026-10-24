# STATUS — hand-over between chats (#179; process v2, #325)

Updated 2026-10-24 by the lead designer chat `session_01EAtiqegHjnDwsoHwD7cjur`
(took over at L5e1's merge, #322 (4); branch `ld/pace`). Chain: `session_01Ld11QmhkPubc8PkfKtd7CT` →
`session_014nrUDvPgiLEjm64scJFkyW` → `session_01VL5M5dKNeREUVf7y1y3P87` →
`session_01DFw3o4EBEtf1adcpyJ5786` → `session_01S8gXf1kch2FCFHYE8nwhrn` →
`session_01Bt5RVRLCv85dFpXLq4qB5W` → `session_01EAtiqegHjnDwsoHwD7cjur` (sessions
notify it with `persistent_session_id` = its id).

**Reading order (#325)**: this file, `BRIEF.md`, `CLAUDE.md`,
`.claude/agents/lead-designer.md`, `DESIGN.md` §18 and the plan in force
(§13n, §13n.8, §17 item 52); `audits/2026-10-24-process.md` §1; everything
else on demand. The previous `STATUS.md` is the last section of `HISTORY.md`.

## For the owner (five lines)

- **Done**: #326 (process); `battle.openingRange` 500–3000 m; the pace study (#328); §17 item 53 merged (#327, PR #103, 175 VERIFIED).
- **Next**: on the owner's E7 answer: B (recommended) = the design partner looks for a rung-2 mechanism in `IDEAS.md`, the lead designer sets the opening at 2500 m; A = rung-1 orders and a stalemate end rule; C = E7 rewritten.
- **Waiting on you**: the E7 question (A / B / C), put 2026-10-24 ~16:20 VN.
- **Money**: this chat's sessions 8.20 USD (runners 0.72 + 0.53; item 53: 6.00 + 0.45 + 0.50, within its 4–7 expected).
- **Running**: nothing.

Not built yet: §17 item 54 (the energy book's beam term).

## Open pull requests

None; `ld/pace` carries this pass's documents and the openingRange records.

## Next steps

1. **The pace study is measured (#328); E7 waits on the owner.** The runner's grid is `tools/estimates/pace-e7.mjs` and `pace-verbs.mjs` (outputs on `run/pace`). The lead designer's probe (seed 1, `ld/pace`): E7 median 38 s on the locked builds; the levers alone 44–96 s; strafe with range open 217 s (6 of 24 without an end); the seed acts only through the dodge intervals (the design partner's check, verified), so seeds 1–4 only where a side strafes or dodges. Verb leverage on one cell: 5 of 19 verbs flip it, all against the player.
2. **§17 item 54** (the energy book's beam term): with L5e2.
3. **L5e2** (E5–E8, W9b, `L5.route.throughput`): planned after the study, costed raw × 1.24.
4. Due when their files are touched: §17 items 47, 50, 51.

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
