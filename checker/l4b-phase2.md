# L4b — physics checker, phase 2 (comparison with the canonical run)

Canonical run read from `origin/m0/l4b` at `b19c1ae` (results record code `e5c67dc`; `git diff e5c67dc b19c1ae -- js mission0/scenarios mission0/targets.js` is empty: kernel and scenarios are the locked ones). All 15 results are PASS. Phase 1 is `checker/l4b-phase1.md` (committed and pushed before any scenario file, result or `battle.js` was opened).

Re-runnable: `cd checker/l4b-sim && node b1sim.mjs` (B1), `node cases.mjs` (B3, B6), `node n.mjs` (B10, B11), `node t.mjs`, `node g.mjs`. These are my own scripts, written from the documents, not from the kernel (`sim.mjs` implements the round rule of §13i.1 and the repair field of §13d.1).

## Discrepancies, first

**None between the kernel and the documents.** There are **nine differences between my phase 1 and the canonical results; every one is my phase-1 error or setup misreading, not a fault of the pass.** After correction my independent numbers agree with the records to the step (±1 step from recoil drift, which phase 1 predicted).

| # | Case | Phase 1 (mine) | Canonical | Cause |
|---|---|---|---|---|
| D1 | B1 shots to destroy the bridge | 10, step 1145 | **12**, step 1387 | I left out the quarters' repair field (§13d.1, §13e.1): R1's quarters restore 200 kg/s × 1/(1+(r/30)²) shared among the damaged cells (the bridge's room is 10.3 m from them), 0.0135 of a bridge cell between two shots |
| D2 | B3 shots to cut the neck | 3, step 305 | **4**, split at 426 | same (hold cells repaired 0.067 per 2 s) |
| D3 | B6 R1 magazine | 3 shots, step 305 | **shot-4**, step 426 | same |
| D4 | B6 R1 reactor | breach at shot 39, step 4625 | **breach 5467, explosion 6067** | same (and the shield generator's 10 t cells repair faster) |
| D5 | B6 R1d magazine, rounds | 9th shot (and I called the lock's literal 10 inconsistent) | **shot-10**, step 1146 | same; **the lock's literal 10 is right, my objection in phase 1 is withdrawn** |
| D6 | B6 R1d beam | 28.95 s | 29.5167 s (1771 steps) | same: repair of the damaged hold and magazine cells costs +0.57 s; 28.95 s is the scenario's own lower bound (no repair), and the scenario's bounds [28.95, 32] hold |
| D7 | B15 | I read "two R1s" as two generators with Σ g | two R1s = the two runs (found, nobody); one generator | my misreading; with one generator g = 0.99611 at 2.5 m my numbers equal the record to 1e-16 |
| D8 | B10 | relative speed 700.0135 m/s | 700 exactly | my misreading: the scenario drifts the target along the unit vector d of the line of fire, as the setup says, so the relative speed is 800 − 100 |
| D9 | B14 | the printed literal "4 × 2.7e7 − 2.7e7 + 1.7663e7" | 3.79125e7 | the lock already notes its arithmetic is per cell; numbers equal mine |

Checker cost: I cannot see the session cost from here.

## Scenario by scenario

### B1 `L4.route.decapitate` — physics right; the check does not pin the damage physics
Independent re-sim (round rule + repair, aim policy of `battle.js`: the first surviving cell's centre by cell index): 12 shots, the bridge's last cell destroyed by `shot-12`, cell integrities after each shot equal the battle's to four digits (shot 1: 0.6667 / 0.8338; shot 2: 0.3468 / 0.6812; shot 3: 0.0270 / 0.5286; shot 4: cell 0 gone, 0.3760; … shot 12: all four gone; quarters 0.6678 / 0.6678 at the end), arrival step 1386 against 1387 (the attacker drifts back about 0.3–0.4 m by shot 7 from recoil, 0.0125 step; phase 1 predicted exactly this +1 once the fraction 0.963 is crossed). Disabled 600 steps later (1987), no explosion, root `shot-12`, chain `disabled:turret ← control-lost:turret ← cell-destroyed:bridge ← shot-12`. Time of flight 1.0994 s → 65.96 steps → first arrival step 66 (the literal): the lock's "1.125 s" in §13l.3 and in comments is 25 ms too long, a documentation nit.
*Meaningful?* Partly. The criterion is a consistency check between the kernel's destruction step and the scenario's own geometric arrival count of the shot that did it; it holds for any damage law. **It would pass if repair, the 1/3 loss or the round rule were wrong** (e.g. 10 shots, or 5). Suggest (non-blocking) adding the independent literal: the bridge's last cell destroyed by the 12th shot (`hitsToWreck` 3 with repair between shots), from the table above.

### B3 `L4.route.split` — right
Independent re-sim: the hold cells of column 5 each lose 1/3 per round and are repaired 0.0667 per 2 s: 0.6667 → 0.4000 → 0.1333 → 0 at the 4th shot, arrival step 426, split into 2 bodies (the record: step 426, 2 bodies), Disabled 1026 = 426 + 600, `no-power` (the weapons are on the bridge side, no reactor). Momentum: 4 rounds × 1172.25 N·s = 4689 N·s, the record's gross 4689.41; |dP − dJ| = 2.8e-14 (limit 1e-9 × gross). The naive case: **it also splits** (step 427, 2 bodies: the beam bay's far column, cells (12,2) and (12,3), is cut off when the near column's cells (11,2) and (11,3) go; I had not seen this in phase 1) but the turret stays able: no end in 120 s, as criterion. Largest fragment ≥ 0.74 of the mass: no `wreckFraction`.
*Meaningful?* Yes for the split (two bodies, the books at 1e-9 × gross, the 600-step gap); the shot count is not pinned (see B1).

### B5 `L4.route.dry` — right, meaningful
154 shots, the last at step 18 360 (0-based), Disabled **18 961** (the labels in the records are completed steps, `battle.step` after the tick: the lock's "+1" is that offset, not an extra step), `why: dry`, store and magazine 0. My phase-1 range 18 959–18 961 is settled at 18 961. The check is a count of steps derived from n, rate and dt, independent of the kernel. Heat: 46 MJ into the turret, +19 K, no shutdown (the record has all 154 shots).

### B6 `L4.kill` — right
R1 magazine: destroyed at the explosion step 426, `shot-4` (D3). R1 reactor: breach 5467, explosion exactly 600 steps later (my sim: breach 5466, the +1 is drift). R1d rounds: first magazine cell by **shot-10** (my sim with repair: 10, step 1146; the plate takes 0.1429 per round while the two hold cells shield it, then 0.2153: destroyed in round 6; the first magazine cell in round 10 because repair gives back part of each 1/3). R1d beam: 29.5167 s, inside [28.95, 32]; first cell of the path takes the whole beam (100 MeV range 112.7 kg/m² < 120 kg/m²). *Meaningful?* The reactor and R1d-rounds rows are independent counts; the beam row is a re-statement through the kernel's `beamDeposit` (declared) with the hand-worked 28.95 s lower bound, which I reproduce independently (1737 steps without repair). The R1 magazine row does not pin the shot count (`expected.shot` 'shot-10' is only used for R1d).

### B10 `L4.relative` — right, setup as stated (D8)
Speed 700 (800 d − 100 d, d the line of fire). The round rule at 700 m/s on r = c × 592 = 914 855.6: passes 1, stops in cell index 1, f = 0.4073762457194 (mine 0.40737624571938913; record 0.407376245719389), s0 = 1 372 160.548 (hand-worked literal, mine 1.3722e6). A drift along +y would give 700.0135 (the aim line is not exactly +y); the scenario's choice keeps the aim on the hull. *Weak point*: at 800 m/s the round passes 1 and stops in the same cell; only f (0.4525 against 0.4074) and the speed itself distinguish the two, and the speed is asserted, so the check is meaningful.

### B11 `L4.cull` — right, to 11 digits
Mine (phase 1, before the record): leaves at t = 4.85 s, distance to the target's body 3001.5038718802 (record 3001.5038718802775), step before 2988.17786513647 (record 2988.1778651364702), left momentum (579.68984, 4764.86723), K = 1.92e6 J; all equal. The binding body is the target's (the attacker's distance is 3893 m). The books close with the RCS impulse.

### B13 `L4.disabled.rule` — right
(weapons lost) Disabled in step 600 (my phase 1: 599 or 600; the loop counts `battle.step − sinceStep ≥ 600` with the first sample at step 0), engine not destroyed and controlled. (no engine) a holding turret is able at every step, no end in 30 s (the repair/cooling of a reactor without its engine over 30 s causes no shutdown). (cut off) 4 shots at steps 0/120/240/360, `dry`, Disabled 961 = (4−1)×120 + 1 + 600 (same offset as B5). The magazine–turret wall (8,3)|(8,4) is the only one, as the setup says.

### B14 `L2.plate.vent` — right, meaningful
44 662 500 → 37 912 500 J/K, 400 K both, vented 7.425e8 J: equal to my hand work; the wrong behaviour would give 3.3497e7 and 1.228e9 J, so the criterion separates the rule from its failure. 

### B15 `L3.shield.nobody` — right
One generator: g = 1/(1 + (2.5/40)²) = 0.99611; field impulse 3200 g = 3187.5486 N·s (record 3187.548638132294); velocity 268.74189 m/s (record 268.7418936446176); energy paid 1 703 333.38380 J (record 1 703 333.383800915). Found: heat = paid − J²/2M − L²/2I = paid − 5.3446 − 0.7555 J (record: 6.1001 J less). Nobody: heat = paid, no impulse. Open books: in the nobody case the momentum the field took from the round (3187.5 N·s) appears nowhere: this is the old fallback by design (§13l.4 B15), but the momentum books of a world with such a field are open by that amount; the scenario rightly asserts the fallback, not closure.

### Read-only scenarios (B2, B4, B7, B8, B9, B12): nothing wrong
B2 Disabled at 47.1 s with the engine working, beam bay and turret wrecked, no explosion. B4 turret shut down by heat at 0.174 of its integrity (estimate 0.17), Disabled, `why: heat`, `parent: shutdown turret (heat)`. B7 0.45 → destroyed at step 1 by pieces, 0.55 → not. B8 every cause resolves (0 errors): B1's chain `shot-12 → cell-destroyed (bridge) → control-lost → disabled`; B6's `shot-4 → cell-destroyed (magazine) → explosion → destroyed`. B9 one line per second for both ships (0…33), two runs, equal hashes. B12 under budget in Node.

## Notes for the lead designer (not blocking)

1. **§13l.1 says the turret aims at "the target room's centre"; `battle.js` aims at the centre of the first surviving cell.** The engineer says so in `aimPoint`, with the reason (a line through an M room's centre is a grid vertex and meets two of the four cells, so no route that needs a whole room works); the rule needs a sentence and a row in `DECISIONS.md`. My phase 1 found the same defect independently and predicted the stall.
2. **A cell a round passes loses 1/`hitsToWreck` whatever the chord** (`fireRound`: `i < passed ? 1 : a / r`). The loop drops cells with a chord ≤ 1e-9 (a corner), but a graze of a few millimetres costs the cell a full third. Not reached by any L4b path (all hits had 4 full cells), an exploit for L5 aim logic.
3. §13l.3's "1.125 s" is the time of flight at 900 m from the muzzle to the CoM; the hits at the faces are 1.087–1.099 s.
4. `expected()` of B1, B3 and the R1 rows of B6 does not state the shot counts the repair field produces (12, 4, 4, 46); my re-sim gives them from the documents (`checker/l4b-sim`), which could serve as the literals.

Discrepancies counted: **0 against the kernel or the documents; 9 between my phase 1 and the canonical results, all mine** (D1–D9).
