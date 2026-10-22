# Physics check of L4a's fix round, phase 1 (blind, from the lock `7399706`)

From `CLAUDE.md`, `DECISIONS.md` #255 #256 #258, `DESIGN.md` §13l.1, §13d.1, §13i.1, §13k.1 and `CONSTANTS.md` only. I did not open `mission0/`, `js/`, `MISSION0.md` or `tools/estimates/` (this file's commit time is the record). Scripts in `checker/l4a-fix-phase1/` (`node plate_v2.mjs`, `beam_v2.mjs`, `shield_bodies.mjs`; they re-implement the rules, nothing from the kernel). T1: edge 5 m, dt = 1/60 s, hold cell 3000 kg / σ 120 / C 1.35 MJ/K, M round 6 kg at 800 m/s (p = 4800 N·s, s0 = 1 568 183.5, S = 3 029 268, c = 1545.364), P dt = 83 333.33 J.

## Findings about the documents (kernel details they do not state)

| # | Finding |
|---|---|
| F1 | **`ruin d 0.2` sits on a threshold.** Burn per step = P F dt / (q m) = 83 333.33 / (3000 × 39 250) = 1/1413 *exactly* (1/burn = 1413.0000000000002 in float) with F = 1. Exact arithmetic: integrity 0 at step 1413; in float it depends on F (is it 1 exactly, or 1 − 1e-16?) and on the order of operations: my left-to-right accumulation of 83 333.33/(1.1775e8) gives a sum still < 1 after 1413 steps → hole at **1414** (23.567 s); an exact reading gives 1413 (23.55 s, the "23.5 s" of #258). `ruin d 0.15` is safe (1/burn = 1059.75 → step 1060, 17.667 s). #177 says no new case sits on a threshold unless it tests that threshold. |
| F2 | **`round d 0.1 ×4`**: 1 − 1/3 − 1/3 − 1/3 = 1.11e-16 in float, not 0. Plate and cell (0,0) are holes after round 3 only if the kernel snaps (§13i.1 says 'a hole at 0'; the float snaps of `rooms.js` are mentioned, not specified). Without the snap round 4 meets a plate of integrity 1e-16. |
| F3 | **Combining chord and cos.** The documents give chord (fraction of the edge crossed in the cell) and σ / cos θ capped at cos θ ≥ d / edge. For the cos cases the setup says chord 1 (path along the row); I take σ_eff = d ρ / max(cos, d/edge) × chord. If the kernel caps differently when chord < 1, the chord-with-cos case is not in the list, so not tested. |
| F4 | **Heat convention after the plate is added.** 'Heat capacity' of a room is stated; the stored heat Q is not: does `addFitting` add C_plate × 290 K of rest heat (T stays 290 K), or leave Q (T falls to 67.9 K for a 0.2 m plate in a 4-cell hold)? And is 'the hold's heat' / 'vented heat' absolute (C·T) or above rest? My numbers below are **above rest** and assume T unchanged by vent (the cell rule of #240/L3, 'a destroyed cell takes its share of capacity and heat as vented, T unchanged'); the absolute vented part would be C_plate × T ≈ 5.2e9 J for ruin d 0.2. |
| F5 | **Plate vent share.** For cells the share is ¼ (equal cells). For a plate the documents don't say; I take its share of the room's heat capacity C_p / C_total (the T-unchanged rule). |
| F6 | **Heat of a round across rooms.** §13k.1 F4: 'lost kinetic energy is heat in the rooms that took momentum, in proportion' — proportion of *momentum taken* (my reading). A stopping plate takes the round's remaining p (the stop). Whether the 6 kg round's mass joins the room is unstated (I add none). |
| F7 | **`shield.bodies`**: the layout (room sizes, where each bridge sits, where holdB is) is not in the documents, so masses, centres, inertias and the kick are formulas; the frame of the round's 'velocity relative to the hull' when the two generators sit on bodies moving differently (case kicked), and whether `impulseHeat` includes the rotational part L²/2I (earlier D2) and the cross term J·V, are unstated. |

## L0.armour.plate.v2

σ_plate = d ρ / cos × chord. Plate mass d ρ 25 = 39 250 / 29 437.5 / 19 625 / 1962.5 kg (d 0.2 / 0.15 / 0.1 / 0.01); its capacity ×450 J/(kg·K) = 17 662 500 / 13 246 875 / 8 831 250 / 883 125 J/K; hold C = 4 × 1.35e6 = 5.4e6 + that: **23 062 500 / 18 646 875 / 14 231 250 / 6 283 125 J/K**.

### Rounds (`plate_v2.mjs`; heat = the whole lost kinetic energy, no body: 1.92 MJ for a stop)

| Case | σ_eff, r | Entries | Plate integrity | Hold |
|---|---|---|---|---|
| round d 0.2 chord 1 ×1 | 1570, r = 2 426 222 | s0 = 1 568 183 < r: **stops in the plate**, sectional momentum 1 568 183, loss (s0/r)/3 = **0.215449**; 4800 N·s to the body | **0.784551** | cells untouched; heat 1.92e6 J (+0.0833 K on 23.06 MJ/K); vented 0 |
| round d 0.2 chord 1/√2 ×1 | 1110.158, r = 1 715 598 | stops in the plate, loss **0.304691** | **0.695309** | untouched; 1.92e6 J |
| round d 0.1 chord 1 ×1 | 785, r = 1 213 111 | plate passes (3713.170 N·s, f 0.40046), c(0,0) passes (946.762, f 0.46168), **stops in c(1,0)** (sectional 24 633.95, loss 0.044279) | **2/3** | c00 2/3, c10 **0.955721**; 1.92e6 J; vented 0 |
| round d 0.1 chord 1 ×4 | as above | rounds 1–3 identical (c10: 0.955721, 0.911441, 0.867162); plate and c00 holes after round 3 (F2); round 4: both holes, **c10 passes** (r A0 = 567.62 N·s) and the round **exits** with p = 4232.38 N·s | 2/3, 1/3, 0 (hole, 19 625 kg leaves) | c10 after round 4: **0.533829**; heat of round 4 = 1.92e6 − 4232.38²/12 = **427 245.5 J**; round 3 vents the plate's capacity share (8 831 250 / 14 231 250 = 0.62056) and ¼ of the 4-cell room (F5) |
| round d 0.1 cos 1/√2 | 1110.158 (same σ_eff as case 2) | stops in the plate, loss **0.304691**, **same as case 2 to 1e-15** | **0.695309** | untouched; 1.92e6 J |
| round d 0.2 cos 0.02 | cap: cos → d/edge = 0.04: σ_eff = 39 250 (= 5 m of steel), r = 6.0656e7 | stops in the plate, loss (s0/r)/3 = **0.0086178** | **0.991382** | untouched; 1.92e6 J. The cap is the active one (0.02 < 0.04); uncapped it would be 78 500 and loss 0.00431 |

Momentum books: p0 = Σ r A over passed cells + the stop's remaining p + p on exit. Tolerance: closed forms 1e-12.

### Beams (`beam_v2.mjs`; my Bethe + nuclear, 1 MeV cut; R(100 MeV) = 112.6415 kg/m²; fractions good to ~1e-3, the kernel's `STOP_ENERGY` unknown)

| Case | Fractions plate / c(0,0) / c(1,0) | Hold heat per step | Integrity lost per step |
|---|---|---|---|
| beam d 0.2 chord 1 (σ 1570) | **1 / 0 / 0** | 83 333.33 J (+3.6134e-3 K on 23.06 MJ/K) | plate **7.0771e-4**; cells 0 |
| beam d 0.2 chord 1/√2 (σ 1110.16) | **1 / 0 / 0** (σ ≫ R) | 83 333.33 J | plate 7.0771e-4 |
| beam d 0.01 chord 1 (σ 78.5) | **0.5212 / 0.4788 / 0** (thin-plate literals of #258) | 83 333.33 J (+0.013263 K on 6.283 MJ/K) | plate 0.5212 × 83 333 / (3000 × 1962.5) = **7.3769e-3**; c00 0.4788 × 83 333 / 9e6 = **4.4336e-3** |
| beam d 0.01 cos 1/√2 (σ 111.016; R − σ = 1.625 kg/m²) | **0.9166 / 0.0834 / 0** | 83 333.33 J | plate **1.2974e-2**; c00 **7.720e-4** |

Fractions sum to 1 (nothing leaves: R < σ_total). The 0.0834 in the last case is the survivors of ~8 MeV leaving the plate; it is insensitive to the 1 MeV cut at ≪ 1e-3, so safe at 1e-3 tolerance.

### Ruin, capacity, mount

- **ruin d 0.2**: with F = 1, hole at step **1413 exactly = 23.55 s, or 1414 in float (F1)**. At that step: deposited 1413 × 83 333.33 = 1.1775e8 J (1414: 1.17833e8), ΔT = 5.106 K (5.109); the plate takes C_p/C = 0.76585 of the stored heat with it: vented (above rest) **9.0180e7 J** (1413) / 9.0243e7 (1414), the hold keeps 2.7570e7 J on **C = 5.4e6 J/K**, plate mass 39 250 kg leaves as debris. Books: deposited = kept + vented to 1e-9 × gross; the beam then falls on c(0,0) with F = 1.
- **ruin d 0.15**: hole at step **1060** (17.667 s), deposited 8.8333e7 J, ΔT 4.737 K, plate share 0.71041, vented 6.2753e7 J, kept 2.5581e7 J on C = 5.4e6, plate mass 29 437.5 kg leaves.
- **capacity d 0.2**: C_hold = **23 062 500 J/K** (5.4e6 + 17 662 500), versus 5.4e6 without the plate; plate mass in the body 39 250 kg.
- **mount d 0.2 on A / on B** (shared wall x = 2 m... between cell (1,0) of A and (2,0) of B; the round from +x enters B(3,0) pass 567.618 N·s, B(2,0) pass 604.632 N·s, then **stops in the plate** at s = 1 040 093 (r 2 426 222), loss 0.142896; the stop's remaining p = 3627.749 N·s; A's cells untouched):
  - mount on A: C_A = **23 062 500**, C_B = **5 400 000**; impulse to A 3627.75, to B 1172.25; heat (F6) A **1 451 099.7 J**, B **468 900.3 J**;
  - mount on B: C_A = **5 400 000**, C_B = **23 062 500**; B takes all 4800 N·s; heat B **1.92e6 J**, A **0**.
  The discriminator is which room holds the plate's capacity and the stop's impulse/heat.

## L0.beam.csda.sweep

The documents give no step law, so the **number of changes is not derivable** (#258 (9) quotes 754 from the reviewer's run: read as a prior, not a derivation). What the physics fixes: R(E) is smooth with d ln R / d ln E = 1.76 / 1.77 / 1.77 / 1.75 / 1.69 / 1.59 at 10 / 20 / 50 / 100 / 200 / 400 MeV (my Bethe, `beam_v2.mjs`). Two adjacent floats differ in E by 1.1–2.2e-16 relative, so the *true* difference of ranges is **1.2e-16 to 3.9e-16**; the summation noise over n steps adds a few 1e-16 per addition, so the largest difference at a change should be **≈ 1e-15, certainly below 1e-14**, against the criterion 1e-12 (margin ≥ 2 decades; before the fix the jump was a partial step, ~5e-6). Structure I expect: step counts non-decreasing in E, each change +1 (any bracket with more than one is split), so **changes = n(400) − n(10)**: a kernel-independent identity the scenario can check. 4000 brackets across ln 40 = 3.69 give spacing 9.2e-4 in ln E; with ~750 changes about 0.2 per bracket, so a few brackets hold two (the split is needed). The bisection to adjacent floats ends with two floats whose ranges differ by the above.

## L3.shield.bodies

Common: g = min(1, 0.6 + 0.5) = 1, round removed J = 3200 N·s, v after = 266.667 m/s, lost KE = 1 706 666.67 J; full buffers (1e7) not binding; shares ∝ B g = 6e6 : 5e6: **A pays 930 909.09 J and takes 1745.4545 N·s; B pays 775 757.58 J and 1454.5455 N·s** (the same in both cases; J is the sectional-momentum stop, independent of the speed if F7 holds).

- **At rest**: each body's momentum change is its own J_i in +y: Δp_A = (0, +1745.4545), Δp_B = (0, +1454.5455); Σ = 3200. Angular momentum about each body's *own* centre: ΔL_i = (x_gen,i − x_cm,i) × J_i (z component = (x_gen,i − x_cm,i) J_i), **so a body's ΔL has no term from the other generator** — the discriminator against booking both on A's body (which would give Δp_A = 3200, Δp_B = 0). Velocities: Δv_i = J_i / M_i, Δω_i = ΔL_i / I_i. Energy: heat_i = paid_i − J_i²/(2M_i) [− L_i²/(2I_i) if the rotational part counts, F7]. Illustrative only (F7: gen 2 × 2 × 10 000 kg + bridge 2 × 2 × 14 800 = 99 200 kg each): J²/2M A 15.356 J, B 10.664 J; impulseHeat A **930 893.7 J**, B **775 746.9 J**; shieldRound's heat = lost − Σ gains = **1 706 640.6 J**.
- **Kicked**: B holds V_B = (Σ impulse of the first round)/M_B and a spin ω_B before. J_i are unchanged (3200 total), so Δp_A, Δp_B, ΔL_i about own centres are **identical to the rest case** if J depends only on sectional momentum. What changes is the energy books: the gain of a body moving at V is J·V + J²/2M, so with V_B ≈ 0.048 m/s (4800 N·s on 99 200 kg) B's cross term is J_B V_B ≈ **70 J** against J²/2M = 10.7 J. Which frame the round's relative velocity and `paid` are measured in, with two bodies moving apart, is F7. A kernel using one body (first generator's) for both the speed and the velocity reference changes the round's speed by V_B / 800 = 6e-5 and the heat by tens of joules: the kicked case discriminates it if the tolerance is below ~1e-6 relative on the speed.
- Books: Σ Δp_i + the round's change = 0 (3200 N·s); Σ ΔL_i about a common point = (x_A − x_ref) J_A + (x_B − x_ref) J_B; energy: lost KE = Σ paid_i = Σ heat_i + Σ gain_i.
