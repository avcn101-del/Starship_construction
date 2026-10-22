# Physics check of L4a, phase 1 (blind, from the lock `6feb7e0`)

Derived from `CLAUDE.md`, `DESIGN.md` §4, §5, §13d.1, §13e.1, §13f.1, §13i.1, §13k.1, §13l.1, `DECISIONS.md` #240–#257 and `CONSTANTS.md` only. I did not open `mission0/`, `js/`, `MISSION0.md` or `tools/estimates/`. All numbers come from my own scripts in `checker/l4a-phase1/` (`node <file>`), which implement the documents' rules independently. `armour.plateThickness` = 0.2 m (#256). T1: edge 5 m, dt = 1/60 s.

Constants used (derived, not read from code): M round d = (m/πρ)^(1/3) = 62.428 mm, A0 = 3.060866e-3 m², s0 = p/A0 = 1 568 183.5 kg/(m·s) (cross-check: 2/3 s0 = `shield.kineticStop` to 1e-15), S = cρL = 3 029 268.3, c = 1545.364; cell masses: hold/magazine 3000, crewed 14 800, reactor 150 000, engine 5700, beam bay 5500, shield gen 10 000, heat sink 3000 + 1290 water; rest Q = C·290.

## Findings about the documents (cannot be derived, or a rule is unclear)

| # | Finding |
|---|---|
| D1 | **Knife edges.** L2.blast.integrity: the magazine's own 1.2 MJ fills it exactly (share 300 000 J = R per cell, in all three cases); the 1/3 hold case has capacity 4 × 100 000 = 400 000 J and a per-cell share of exactly 100 000 J = remaining integrity × R. "Destroyed when its share reaches its resistance" then turns on the last ulp of `damageCell`'s 1 − 2/3. §13l.4 / #177 say no new case sits on a threshold unless it tests that threshold. |
| D2 | **A3's 1e-12 against `J²/2M`.** §13l.1 books the ship's kinetic-energy gain as J²/2M. For an impulse at a point off the centre of mass, the gain also has a rotational part L²/2I. On R1 (my M = 950 534.057 kg, CoM (24.1355, 16.1842) m, I = 1.15002e8 kg·m²): g = 1: J²/2M = 5.3864 J, L²/2I = 0.7614 J (4.5e-7 of the 1.7067 MJ); g = 0.6: 1.9391 J and 13.041 J (1.06e-5). A hand-worked value with J²/2M only and a kernel with the true gain (or the reverse) differ by far more than 1e-12 and than E2's 1e-9 × gross (1.7e-3 J). The documents do not say which one the books use. |
| D3 | **Overlapping buffers, "solved once more with what was paid".** Two readings differ when a generator is capped (case "A capped"): (1) shares of the full-stop energy, each capped: both pay everything, v = 522.813 m/s; (2) shares of what the summed buffers can pay, A capped, B not: paid 1 084 615 J, v = 527.695 m/s. The case name "A capped" fits (2). The document does not decide. Also unstated: how the ship's J²/2M is split between the two generators' heats, and the layout ("a bridge and three holds") needed for the angular impulse. |
| D4 | **Plates and the fitting rules.** §13f.1 says a fitting sits on an *open edge* of a room that is not *inside* (the magazine is inside). §13l.1 puts plates on shared wall segments, around the magazine, and R1c must validate. The exemption of plates from `fitting-open-edge` and `fitting-inside`, and which of the two rooms a shared-wall plate is mounted on (heat, mass, centre), are not stated. |
| D5 | **A9's setup vs the physics.** At 0.2 m an M round (s0 = 1.568e6) cannot pass a plate (r = 2.426e6): it stops in it, in both chords (0.2 m, chord 1/√2: r = 1.716e6, still above s0). "A hole after `hitsToWreck` passing rounds" can only happen at d = 0.1 (or below). At d = 0.2 the plate falls by stopping rounds: 5 of them (1/0.215449 = 4.64). |
| D6 | **`csdaRange`.** The integrator's order, `csdaSteps`, `STOP_ENERGY` and `PATH_STEP_*` are not in the documents. A4's 1e-12 holds only if the quadrature error at a step-count change is below 1e-12; the fix (last step ends at `STOP_ENERGY`) removes the 5e-6 partial-step jump but not a difference in quadrature error between n and n+1 steps. I can give the true neighbour difference (≈1.6–1.8e-14, below) but not the kernel's. |
| D7 | **Event names and order** in L3.control.bridge: the cause string of the bridge's own `control-lost` when overheated, whether the other rooms' `control-lost` and the reactor's `scram` fall in the shutdown step or the next, and the `control-restored` causes are not specified. |
| D8 | **Literals.** R1 = 950 534.057 kg (rounded 950 534 in #248, §13k.3), R1c 1 264 534.057 (A10 quotes 1 264 534): a 1e-12 comparison to the rounded integer fails by 4.5e-8. The heat sink's water is 1.35e6 × 4 / 4186 = 1289.97 kg per cell (the text says 1290). |
| D9 | **Contents positions** (900 kg of magazine rounds, 24 kg ready store) for the centre and inertia are not stated; I put them at their room's centre. Moving 900 kg by 5 m shifts I by 2.2e4 (2e-4 relative) and the CoM by 5e-3 m, so the centre and inertia are derivable only to about 1e-4. |
| D10 | `addRoom`'s message texts are not in the documents (only that it throws); whether a stopped round's 6 kg joins the ship; the heat of a round in a cluster (no body) is taken as the full lost kinetic energy. |

## L0.armour.plate

Plate σ = d ρ = 1570 / 785 / 78.5 kg/m² (d = 0.2 / 0.1 / 0.01); r = c σ chord; plate mass = d ρ 25 = 39 250 / 19 625 / 1962.5 kg; path entries: plate, hold cell (0,0) σ 120, hold cell (1,0) σ 120 (chord 1 on the cells; only the plate carries the case's chord). Round rule of §13i.1: passes if s > r and f + r/S < 1; the cell takes r·A (passes) or min(s, r) (stops); loss 1/3 per pass, (taken/r)/3 for the stop. Script `rounds.mjs`.

| Case | Entries and what each took | Stops | Plate integrity after |
|---|---|---|---|
| round d 0.2, chord 1 | plate r = 2 426 221.8; s = 1 568 183.5 < r | **in the plate**, sectional 1 568 183.5; 4800 N·s to the body | 1 − 0.215449 = **0.784551**; hold cells untouched |
| round d 0.2, chord 1/√2 | plate r = 1 715 598; s < r | in the plate | 1 − 0.304691 = **0.695309**; hold untouched |
| round d 0.1, chord 1 ×1 | plate r = 1 213 110.9 passes (takes 3713.17 N·s, f = 0.40044, p = 1086.83); cell (0,0) r = 185 443.7 passes (946.76 N·s, f = 0.46166, p = 140.07); cell (1,0): s = 24 634 < r | **in cell (1,0)**, loss 0.044279 | 2/3; cell (0,0) 2/3; cell (1,0) 0.955721 |
| round d 0.1 ×4 | rounds 1–3 identical; plate and cell (0,0) reach 0 after round 3 (holes; the plate's mass leaves as debris); round 4: plate and (0,0) holes (no cost), cell (1,0) passes (r A0 = 567.62 N·s), exits with p = 4232.38 N·s | rounds 1–3 in (1,0); round 4 **exits** | plate 0 (hole); cell (1,0): 0.955721, 0.911442, 0.867163, then 0.533830 |

Heat in the hold (cluster, no body: the whole lost kinetic energy, 1.92 MJ for a stopped round): d 0.2 ×1: 1.92e6 J, d 0.1 ×1: 1.92e6 J; d 0.1 ×4: 3 × 1.92e6 = 5.76e6 before round 3's cell vents ¼ (1.44e6) → 4.32e6, + round 4's 427 245.5 (1.92e6 − 4232.38²/12) = **4 747 245.5 J** above rest, in a 3-cell room afterwards.

Beam, 100 MeV (N = 2: 10 MeV/m × 2 × 5 m), P dt = 83 333.33 J per step. My Bethe + nuclear-interaction integration (`beam_bethe.mjs`, lower cut 1 MeV; it gives R(100 MeV) = 112.64 kg/m² = 0.2816 armour cells, the figure of §13k.3) gives:

| Case | Fractions (plate, cell (0,0), cell (1,0)) | Hold's heat above rest |
|---|---|---|
| beam d 0.2 chord 1 (σ 1570) | 1.0000, 0, 0 | 83 333.33 J (all of P dt; nothing leaves) |
| beam d 0.2 chord 1/√2 (σ 1110) | 1.0000, 0, 0 | 83 333.33 J |
| beam d 0.01 chord 1 (σ 78.5) | **0.5212**, **0.4788**, 0 (to about 1e-3, the unknown `STOP_ENERGY`) | 83 333.33 J |

Plate burn per step (P F dt / (q m)): d 0.2: 7.0771e-4 (so a 5 MW beam takes 1.4 ks to ruin it); d 0.01: 0.5212 × 83 333 / (3000 × 1962.5) = 7.377e-3. Sums of fractions are 1 to the integrator's error (≈1e-6 in mine). Tolerance suggestion: 1e-3 on fractions (kernel Bethe steps unknown), 1e-9 on the heat sum.

## L0.beam.csda.continuous

True range R(E) in iron (my Bethe, 1 MeV cut): 1.9311, 6.5501, 33.179, 112.64, 372.54, 1164.24 kg/m² at 10, 20, 50, 100, 200, 400 MeV; d ln R / d ln E = 1.76, 1.77, 1.77, 1.75, 1.69, 1.59. The neighbour step of E*(1 + k·1e-14) therefore changes R by **1.6–1.8e-14 relative** (smooth) plus float noise of a few 1e-16 per addition; the largest neighbour difference should be below about 1e-13 at all six energies, and the two ends' step counts differ by at most a few (the table's ≈750 changes in 10–400 MeV). Meets 1e-12 only if D6 holds. The 1000 samples span ±5e-12 of E*, so a monotone drift of ≈ 1.7e-14 × 1000 = 1.7e-11 over the set is expected.

## L1.reactor.meltdown.coupled

C = 4 cells × 5.5e6 = 2.2e7 J/K (T1), × 8 = 1.76e8 (T3); no radiators, demand 0, so no generation, no decay heat (7 % of zero thermal power); shutdown at the first step (960 K > 800 K); only `externalPower`. ΔT to critical 1000 K = 40 K: t = C ΔT / P = **125.7143 s** (T1, 7 MW) and **251.4286 s** (T3, 28 MW). Explicit Euler on the step grid: n = ceil(t/dt) = 7543 and 15 086 steps, so the event falls in [125.7143, 125.7310) and [251.4286, 251.4452) s (the stamped time 125.7167 / 251.4333 s). Explosion: E = 2e8 J (T1), 1.6e9 J (T3, k = 3); own capacity B = 4 × 100 × cell mass = 6e7 (T1), 4.8e8 (T3) → absorbed 6e7 / 4.8e8, escaped 1.4e8 / 1.12e9 (all four cells destroyed: share E/4 ≫ R); crew at critical die (4 at T1, 16 at T3). Heat books: generated = external × t exactly = stored increase (before the cells' vent).

## L2.beam.chord

100 MeV, cells σ chord: chord 1: (120, 120): **1.0000, 0** (range 112.64 < 120). Chord 0.5: (60, 60): **0.3798, 0.6202** (sum 1; nothing leaves, range 112.64 < 120). Heat in the hold per step 83 333.33 J. Tolerance as above.

## L2.blast.integrity

E = 6e6 × (2/3)³ = 1 777 777.78 J (AP: charge only). Magazine capacity 4 × 100 × 3000 = 1.2e6 (full); excess 577 777.78 J goes to the hold (the only unsaturated neighbour). Hold capacity Σ integrity × 300 000: full **1.2e6**, 2/3: **8e5**, 1/3: **4e5**.
- full: hold absorbs 577 777.78, escapes 0; each hold cell takes 144 444.4 → integrity 0.518519;
- 2/3: absorbs 577 777.78, escapes 0; per cell 144 444.4 → integrity 2/3 − 0.481481 = 0.185185;
- 1/3: absorbs **400 000**, escapes **177 777.78**; each cell's share 100 000 = its remaining R → integrity 0 / destroyed (D1).
Books: absorbed + escaped = E exactly; absorbed = 1.2e6 + the hold's; the magazine's four cells (share 300 000 = R) are destroyed in every case (D1); events: 4 `cell-destroyed` in the magazine (and 4 in the hold at 1/3).

## L2.conduction.euler

G = 4000 × 10 × 1 = 40 000 W/K, C = 2.2e7 J/K each. Step 1: **200 000.0 J** (T 589.99091 / 290.00909); step 2: 40 000 × 299.981818 / 60 = **199 987.879 J** (ratio 1 − 2G dt/C = 0.99993939). A second-order step would give a different step 2 at 1e-5 level, which the closed form discriminates.

## L2.layout.invalid.v2

Placements: overlap, off-grid, 45° and non-integer cell each throw (messages not in the documents, D10); the valid pair does not. Blueprints: R1 valid; each broken rule invalid and names its rule (`grid`, `overlap`, `connected`, `hull`, `exhaust`, `axis`, `bow`, `fitting-open-edge`, `fitting-inside`, `fitting-exhaust`, `fitting-per-edge`); the exact set of rules named depends on the edit (one edit can break two, e.g. a room off the grid can also disconnect). R1 without quarters: `crew` (20 required, 0 berths); removing the quarters leaves the structure connected (the turret hangs on the magazine, the heat sink on the reactor). Plate on an edge inside the magazine (between two of its cells): neither hull edge nor shared wall segment → `plate-wall`. R1c's 8 plates: the magazine's walls are all shared (bridge ×2, beam bay ×2, quarters/turret ×2, hold ×2) → valid, provided D4.

## L2.repair.crew

Deaths = floor(4 × 1.2 / 4) = 1: crew **4 → 3**, one `crew-died`. Repair: distance between centres 12.5 m, g = 0.852071, two asks 170.414 each, Σ 340.83 > R = 200 → scaled by 0.586806, each cell gets **100 kg/s** = 0.0067568 integrity/s: cells 0 and 1 reach 1.0 after 0.6 × 14 800 / 100 = **88.8 s**. Crew after repair: **3** (the dead do not return). Then 0.1 from cell 2: floor(4 × 0.1 / 4) = 0 new deaths, cumulative stays 1: crew **3**, no event.

## L2.shield.overlap.round

r for g = 0.6 is 32.660 m, for g = 0.5 is 40 m; g = min(1, 1.1) = 1; full-stop removal J = 3200 N·s, v after 266.667 m/s, energy 1 706 666.67 J (`shield_overlap.mjs`).
- both full (1e7, 1e7): shares ∝ B g = 6e6 : 5e6 → A pays **930 909.09 J** and takes **1745.45 N·s**, B pays **775 757.58 J** and **1454.55 N·s**; v = 266.667; the body gains 3200 N·s in +y; ΔL = Σ J_i (x_i − x_cm) = 1745.45 (5 − x_cm) + 1454.55 (55 − x_cm) (needs the layout, D3).
- B nearly empty (1e7, 1e3): weights 6e6 : 500: B pays **142.21 J** (below its 1000 J: not capped, so this case tests proportionality, not the cap), takes 0.2666 N·s; A pays 1 706 524.46 J, 3199.733 N·s; v = 266.667.
- A capped (1e6, 1e5): summed buffers 1.1e6 < 1.7067e6, so only a partial stop. Reading (2): A asks 1 015 385 → capped 1e6, B 84 615 → pays 84 615; paid 1 084 615 J, v = **527.695 m/s**, J = 1633.83 (A 1506.37, B 127.46); buffers after 0 and 15 384.6. Reading (1): both pay all, v = 522.813, J = 1663.12 (A 1511.93, B 151.19). D3.
Heat per generator = what it paid less its share of J²/2M (≈ 29 J on a 175 t ship), not derivable (D3).

## L3.beam.deposit

σ 120 < 112.64 + …: the cell takes **F = 1.0000** (range 112.64 < 120), Q = 83 333.33 J. Integrity loss in the step: 83 333 / (3000 × 3000) = 0.00926 ≫ 1e-6, so the cell is **destroyed**; deposit first, then damage (F21): the cell's ¼ share of the hold's heat leaves as vented: **vented 20 833.33 J**, the hold keeps **62 500 J** above rest (not zero: the survivor `k1.deposit.damageFirst` would give 0 deposited).

## L3.control.bridge

Overheated: the bridge's C = 4 × 0.6e6 = 2.4e6 J/K needs 2.4e6 J for 1 K; net power ≈ 2 MW + 0.1 MW (its draw) − 0.2 MW (life-support pump, capacity 50 000 × 4) − ≈ 0.04 MW passive conduction (3 × 250 W/K) = ≈ 1.86 MW → ≈ **78 steps (1.30 s)** (my simple model; ± a few steps, D7). Then: the bridge's `shutdown` (heat), its own `control-lost`, `control-lost` for the other nine rooms (reactor, engine, heat sink, shield generator, quarters, turret, magazine, beam bay, hold) and a `scram` of the reactor; no `control-restored` (temperature never falls). Off: switching off for 3 steps gives the bridge's own `control-lost` with cause `off` (#257 Q2), the others' `control-lost`, the reactor `scram`; switching on again gives `control-restored` for the bridge and the rooms; the reactor stays SCRAMmed (restart needs 60 s and T < hot).

## L3.destroyed.mass

Mass before 950 534.057 kg; damaged cells keep their whole mass; the destroyed pristine hold cell leaves as debris: **947 534.057 kg** after (−3000 kg), debris 3000 kg at the velocity of its point (zero: ship at rest), ¼ of the hold's (excess) heat vented.

## L3.r1c.props

Intact: M = 950 534.057 + 8 × 39 250 = **1 264 534.057 kg**; acceleration 15e6 / M = 11.8620 m/s² = **1.20960 g**; centre **(28.0749, 15.8901) m**; I = **1.84549e8 kg·m²** (D9: ±1e-4). Wrecked (5 M rounds stop in the plate, loss 0.215449 each: 4 rounds leave 0.1382, the 5th ruins it): mass **1 225 284.057 kg** (−39 250 debris), centre **(27.7730, 16.0788) m**, I **1.79546e8**; the body took 5 × 4800 = **24 000 N·s** in +y, the debris carries its share; the books close. Heat in the magazine ≈ 5 × 1.92e6 = 9.6e6 J (−J²/2M terms ≈ 45 J).

## L3.shield.energy

g = 1: v = 266.667 m/s, lost 1 706 666.67 J, heat = lost − gain: 1 706 661.28 (J²/2M only) or 1 706 660.52 (with L²/2I), D2. g = 0.6: v = 480 m/s, lost 1 228 800 J, heat 1 228 798.06 (J²/2M only) or 1 228 785.02 (full).

## L4.crew.capacity

Required: bridge 4 + reactor 4 + engine 2 + magazine 2 + shield gen 2 + beam bay 3 + turret 3 = **20**; berths 6 × crewPerCell: 3 → **18: rejected `crew`** (20 > 18); 4 → **24: valid**; no quarters → 0 berths, rejected `crew`.

## L4.readout.blueprint

R1: M = 950 534.057 kg, centre (24.1355, 16.1842) m, I = 1.15002e8 kg·m²; R1c: M = 1 264 534.057, (28.0749, 15.8901), I = 1.84549e8. Before = after to 1e-12 (the same functions: a consistency invariant, §13k.4; the literals above are the check that means something).
