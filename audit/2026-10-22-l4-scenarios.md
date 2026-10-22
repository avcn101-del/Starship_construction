# Audit (d, light): the L4 scenarios, 2026-10-22

Auditor: `.claude/agents/auditor.md`, read-only. Branch `audit/l4-scenarios` from `main` at `5c54eb6`. Nothing changed, locked, recorded or decided. No sub-agents. Session cost: not visible to me. Wall time about 70 min.

## Commands run (repo root, Node v22.22.0)

```
node tools/m0.js regress   # 107 VERIFIED + 87 WITHDRAWN + 5 RETIRED, 0 MISMATCH/FAIL; git status clean afterwards
node tools/mutate.js --only l4b.hit.holesHit,l4b.hit.chordOne,c1.thr.turretWorksShutdown,k1.beamPaths.neverCleared,e1.rep.destroyedRepairable,f1.ctl.reactorNeedsControl,f1.ctl.bridgeBackup,d1.ammo.explodedMagFeeds,e1.pd.crewNotCapped,i1.rd.stopsOnEqual --out <scratchpad>   # 10 of 10 SURVIVED at 5c54eb6
node tools/m0.js run L4.route.decapitate --set kinetic.hitsToWreck=1    # PASS (exploratory)
node tools/m0.js run L4.route.split      --set kinetic.hitsToWreck=1    # PASS
node tools/m0.js run L4.kill             --set kinetic.hitsToWreck=1    # R1 magazine PASS, R1 reactor PASS, R1d rounds FAIL (shot-10), R1d beam PASS
node tools/m0.js run L4.kill.pieces      --set battle.wreckFraction=0.4 # PASS (the 0.45 case expects "not destroyed")
node tools/m0.js run L4.e8 --set kinetic.hitsToWreck=3                  # 0.2256 ms/step (4-core Xeon 2.1 GHz); another run 0.3188
```
No `run` without `--set` was made; all `--set` runs are unrecorded.

## Summary

| Severity | Count |
|---|---|
| tautology / re-statement | 3 |
| no literal | 4 |
| tolerance | 2 |
| threshold | 3 |
| lock | 1 (process; the mechanical lock checks all pass) |
| uncovered rule | 3 |
| claim without proof | 3 |

Lock mechanics, withdrawals: clean (section 3). Most important: **U1** (shot counts unpinned, demonstrated), **U2** (two L4b rule mutants survive; every L4b shot is axis-aligned), **N2** (B7 and the 600-step gaps read their constant from `params`; wreckFraction 0.4 passes).

## 1. Uncovered rules (survive, or pass with the rule broken)

**U1** `mission0/scenarios/L4/route-decapitate.js:28` — `return { gap: Math.round(ctx.params.battle.disabledSeconds.value / ctx.dt), firstArrival: 66 };` — B1, B3 (`route-split.js:36`) and the two R1 rows of B6 (`kill.js:62`, `:84` checks shot-10 only for R1d) pin no count of rounds that destroy a bridge, a neck, a magazine or a reactor. With `kinetic.hitsToWreck=1` B1, B3 and both R1 rows of B6 still PASS (only R1d's `shot-10` fails). The reviewer's N8 holds; B1 and B3 even declare `kinetic.hitsToWreck` tunable. Resolution: add the hand-worked shot count per row (B1 records shot-12, R1 magazine shot-4) or drop the tunable claim.

**U2** `js/battle.js` hit test — mutants `l4b.hit.holesHit` ("a path of holes is no hit") and `l4b.hit.chordOne` (chord := 1) SURVIVE at `5c54eb6` (also in `b19c1ae`). Cause visible in the scenarios: every L4b battle fires along an axis through cell centres (bearings ±y, +x; aim points on columns), so the chord is always 1, and B1 stops counting at the bridge step so no shot is fired through an all-hole path. Resolution: one oblique shot (chord < 1 on the loop's path) and one shot at a wrecked room, with the expected count worked by hand.

**U3** `js/rooms.js:676` vs `js/battle.js:363` — the "able" rule is written twice: the firing gate in `turret()` and `weaponStates`. B4 (`route-overheat.js`) proves only the second: the target (T-gun) never fires. `c1.thr.turretWorksShutdown` (turret fires while shut down) SURVIVES. Resolution: B4 with `targetFire` set, expecting no shot after the shutdown step. Other survivors I ran (all SURVIVED at HEAD) and my triage:
- `e1.rep.destroyedRepairable` — uncovered: `repair-crew.js` has no destroyed cell beside a damaged one (#206). Add one.
- `k1.beamPaths.neverCleared` — I could **not** explain why B6's beam case (`kill.js`, own stepped sum with destroyed entries at sigma 0) does not notice a stale deposit cache. Either the cache is cleared elsewhere (equivalent) or the own sum copies the stale path. Not root-caused.
- `i1.rd.stopsOnEqual` — uncovered threshold s = r (L0 rule; no L4 line); `f1.ctl.bridgeBackup` — uncovered, I did not read what it changes.
- `f1.ctl.reactorNeedsControl` — probably equivalent (control loss SCRAMs the reactor in the same step); `d1.ammo.explodedMagFeeds` — equivalent for L4 (the explosion ends the battle); `e1.pd.crewNotCapped` — probably equivalent (share <= crewTotal). Reading only, not proven.
- Not run (rule not L4): d1.ammo.sizeMatch, d1.shov.secondRound (`d1.ammo.*`, all L4 targets are size M).
- Good news: `l4f.plate.cellVentsPlate` SURVIVED in `fc47687` (L4a) and is KILLED by `L2.plate.vent` in `b19c1ae`.

## 2. Tautology, literals, tolerances, thresholds

**T1 [tautology, declared]** `L4/relative.js:44` — `'the round rule at 700 m/s': a.kernel.passed === a.own.passed && ...` — `own` is the kernel's own `penetrateRound`; only the 700 m/s and s0 literal are independent. Resolution: add one literal (cells passed, f) for the 700 m/s round.

**T2 [tautology]** `L3/shield-nobody.js:53` — `'nobody: heat = the energy paid (hand-worked)'`: compares two quantities the kernel assigns one to the other; by §13k.4 a consistency invariant, labelled hand-worked. Resolution: relabel; do not count towards E3.

**T3 [tautology]** `L0/beam-csda-sweep.js:47` — `count: 754` "hand-worked from tools/estimates/l4.mjs": the literal is `csdaSteps` run by the estimate (`l4.mjs:235-237`), and the check `changes === steps(400) - steps(10)` uses the function under test on both sides. Resolution: relabel as a regression pin; add an independent bound (steps = ceil(range/dx) at two energies by hand).

**N1 [no literal]** the kernel's own output is quoted as "hand-worked": `L3/shield-energy.js:40` (R1 M, centre, I to 17 digits), `L3/r1c-props.js:61`, `L4/readout-blueprint.js:30`, `L4/kill.js:62` (`shot-10`), all "from tools/estimates/l4.mjs" which runs the kernel. They pin regressions, not the derivation; the R1 mass is a sum of room masses and could be given as one. Resolution: say so in the criterion, or derive M and I from the room table in the scenario.

**N2 [no literal]** the constant is read from `params`, the number lives only in prose: `L4/kill-pieces.js:29` (`c.share < ...wreckFraction.value`), `route-decapitate.js:28`, `route-split.js:36`, `disabled-rule.js:34` (the 600-step gap), `kill.js:62` (breachCountdown). Evidence: mutation `l4b.wreck.fraction04` is CHANGED not KILLED (`b19c1ae.txt:175`) and `--set battle.wreckFraction=0.4` PASSes. B5 (`route-dry.js:38`) and B13's cut-off case (`disabled-rule.js:55`) do carry `18961` and `961`, which pins `disabledSeconds`; breachCountdown and wreckFraction are pinned by nothing. Resolution: literal 600 / 0.5 in `expected()`.

**N3 [no literal]** `L4/route-overheat.js:26` and `route-mission-kill.js:26` — `expected()` returns states only (no time, no heat C dT / P, no destruction count). The B4 criterion says "how much integrity is left is not a criterion", so the shutdown time is not pinned at all. Resolution: the shutdown time off the step grid by C dT / P.

**N4 [no literal]** `L2/beam-chord.js:36` — chord 0.5 asserts only `fractions[1] > 0`; the numeric check is the re-statement `beamDeposit` with `120 * chord` (killed `k1.chord.beamIgnored` shows it works, but no independent F_2). Resolution: one hand-worked F_2.

**TOL1** `L4/route-split.js:57` — `dP <= 1e-9 * gross + 1e-12`; recorded dP 2.8e-14 (gross 4689) and 1.2e-11 (gross 19202): the tolerance is 4.7e-6 and 1.9e-5, 7-9 orders above the residue. Same pattern: `shield-overlap-round.js` impulse 1e-9 J vs 6e-16, `shield-bodies.js`. Allowed by #220 but a conservation leak below 1e-9 relative passes. Resolution: tighten to 1e-12 x gross where the measured residue is 1e-14..1e-11, or state the reason.

**TOL2** `L3/beam-deposit.js:66` — `'it vents E / 4 (hand-worked)': close(e.vented, a.vented, 1e-9)` while the other three checks of the same closed form use 1e-12 (§13k.4). Resolution: 1e-12 (or name the float reason).

**TH1** `L2/repair-crew.js:20,34` — one loss of 1.2 cells: floor(1.2) = 1; round(1.2) = 1 too, so floor vs round is not tested, nor a loss just below 1 (0 deaths). Resolution: add cases at 0.9 and 1.6.

**TH2** `L4/kill-pieces.js:25` — cases 0.45 and 0.55 only, around 0.5: "<" vs "<=" at exactly 0.5 (40 of 80 cells) is not tested (#177). Resolution: a 0.50 case, expected not destroyed.

**TH3** `L4/route-dry.js:25`, `L4/disabled-rule.js:38` — shot k at k/0.5 s = 120k steps exactly on the step grid (N1 convention asks for off-grid); exact equality of step counts pins the rounding convention (+1). Declared "discrete by nature" in B5. Also `L0/armour-plate-v2.js` ruin step 1413 on the grid, declared. Resolution: accept, or add a fire rate that is off the grid (e.g. an override case).

Good: `L4/cull.js` tests the threshold across one step (2988.2 m before, 3001.5 m after, D = 3000); `crew-capacity.js` (3 / 4 / none, one reason each); `kill-pieces` hand shares at 1e-12; `reactor-meltdown-coupled.js` off-grid, one-sided, 880/7 and 1760/7; `conduction-euler.js` separates Euler from trapezoid by 3e-5 with a 1e-12 tolerance; `blast-integrity.js` arithmetic (5.2/9, 14/27, 5/27) checked by me.

## 3. Lock discipline

- All 33 scope files: the lock commit changes exactly one line (`locked:`) in each file: `6feb7e0` (L4a, 16), `7399706` (fix round: `armour-plate-v2`, `beam-csda-sweep`, `shield-bodies`), `e5c67dc` (L4b, 15). It precedes the file's first record (`394aa13` / `ca2b896` / `3e0b92f`). `git diff --name-status 6feb7e0 HEAD -- mission0/scenarios` shows only additions: no scope file changed after its lock. The record's `lockedHash` equals the file's hash for all 33. `regress` confirms (criterion unchanged since lock).
- **Withdrawals** (`mission0/withdrawn.json`): `L2.layout.invalid` -> `L2.layout.invalid.v2`, `#258`, `recordHash e86a6536`; `L0.armour.plate` -> `L0.armour.plate.v2`, `#258`, `recordHash 6598c8f6`. Both name decision and successor; `regress` reports "ok record unchanged since withdrawal" for both (frozen FAIL and frozen PASS respectively), the reasons match the records.
- **LOCK1 [lock, process]** each scenario first appears in the same commit as the kernel code it tests (`16badb7` "Build L4b's battle loop ... write B1-B15", `ab19ccc`, `752f9f5`) and is locked 7-11 s later. The criteria were therefore written with the kernel in hand, and numbers came from kernel runs before the lock (`e8.js:20` "1987 steps at the time of the lock"; `shot-10`; `754`). This does not break the rule text ("before the first canonical run") but weakens its purpose. Resolution: the lead designer writes or approves criteria before the kernel commit, or the criterion says which numbers were read off a kernel run.
- History is a shallow clone (288 commits): nothing earlier checked.

## 4. Claims of section 13 for L4

- **"Every capture route reaches Disabled"**: proven by passing scenarios for decapitation (B1, steps exact, first arrival 66 hand-worked), mission kill (B2, state), split (B3, 600 steps after the split, momentum), overheat (B4, state: Disabled's parent is the shutdown, cause heat), run dry (B5, `18961` literal), plus weapons lost / cut off (B13, `961`). Caveat U1/U3: B1-B3 pass whatever the round count; B4 never has the target fire.
- **"The cascade tree is right"**: only partly. `L4.cascade` runs `battleTree` on B1 and B6-R1; B2-B5, R1d and the beam case are not checked for dangling parents. The B1 shape asserts the bridge cell-destroyed in the chain, control-lost of every room and scram under the reactor's control-lost, but **not** "Disabled under the turret's control-lost" that DESIGN B8 / #267 states (`cascade.js:44-48`; the criterion text calls it a question for the PR). **C1 [claim without proof]**.
- **C2 [claim without proof]** `L4/route-split.js:60` — the naive case's criterion says "the beam bay destroyed, the turret still able"; compare asserts only `ended === null` at 120 s, which also holds if the attacker never hits. Resolution: assert the beam bay destroyed and the turret able.
- **C3 [claim without proof / measured only] E8**: `L4/e8.js:35` returns only `ms < 1`; the time is printed, not recorded (0.23-0.32 ms/step on a 4-core 2.1 GHz Xeon here, 1987 steps, T1). It passes by a 3-4x margin on this machine; "allowing for a phone" is not tested, and T6 waits for L6. Resolution: record the printed time in the ledger per run; phone measurement is the owner's.
- **E2**: `L4.log` compares two runs in one process only (`log.js:37`); cross-process / Chromium is `L0.determinism`. Momentum at splits: B3. Heat books: not exercised by the L4 battles.
- **E1**: regress 107 VERIFIED, 87 WITHDRAWN, 5 RETIRED, 0 mismatch (ran it).
- **E3**: the L4 laws with a passing proof are those of section 4 first bullet, L4a's A1-A10 and B10, B11, B14, B15; laws without: the turret shutdown firing gate (U3), chord and holes in the battle loop (U2), the kill round counts (U1).
- Spec drift (info): DESIGN B6 names `L4.kill.magazine` and `L4.kill.reactor`; implemented as one `L4.kill` with four cases. `L2/plate-vent.js` states that DESIGN 13l.4's arithmetic is per cell (acknowledged there).

## 5. Not checked, and why

- Independent derivation of the physics literals (armour-plate-v2 thin-plate fractions 0.52117..., 7.0771e-4 burns, `shot-10`, the [28.95, 32] s bound of `kill.js`, the beam F values): that is the physics checker's role; I only checked arithmetic of blast-integrity, conduction-euler, plate-vent, shield-overlap-round, crew-capacity and the 600/961/18961 step counts.
- Mutation survivors outside L4's rules (the other ~39 of `b19c1ae`/`fc47687`); only ten were re-run, the rest triaged by reading or not at all.
- Cross-process determinism, phone viewport, T6, any change after `5c54eb6`.
- Session cost: not visible.
