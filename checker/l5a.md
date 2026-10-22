# Physics checker, phase 1 (blind) — PR #73, L5a

Derived from CLAUDE.md, CONSTANTS.md, DESIGN.md §13i.1, §13k.1, §13l.1, §13d.1, §13c, §13f.2, §13n.1 (b), `mission0/targets.js` and DECISIONS #273, #274, #278 only. Numbers from my own throwaway script (not in the repo). Not opened: `mission0/scenarios/`, `mission0/results/`, `MISSION0.md`, `js/`, `tools/estimates/`, the PR body or diff, §13n.3, §13n.4's "Expected" column. I did see line 708 of §13i.3 and the §13n.1 (b) text, which quotes 705 / 333 / 489 m/s and "94 MJ"; my values below were computed from the rules before I compared them.

Setup: c = 1545.3642 m/s; M round 6 kg steel, D = 0.062428 m, A0 = 3.06087e-3 m², L = 0.249711 m, S = c ρ L = 3.02927e6 kg/(m s), p0 = 4800 N·s, s0 = p0/A0 = 1.56818e6. Cell σ: hold, magazine 120 kg/m² (r = 185 443.7); crewed 592 (r = 914 855.6); 0.2 m plate 1570 (r = 2 426 221.8). L round: 20.25 kg, A0 = 6.88695e-3, S = 4.5439e6, s0 = 2.35228e6.

## 1. Chord-scaled loss (hold column, M round, 800 m/s)
Rule: a passed cell loses chord/3 (flat, independent of how much the round has slowed); the stopping cell loses (taken/r)/3 with taken = min(s, r) and r chord-scaled. The wreck guard f + r/S < 1 never binds (f ≤ 0.42 at the stop).

| chord | each passed cell loses | passed | stops in cell (0-based index) | stop cell loses |
|---|---|---|---|---|
| 1 | 0.33333 | 6 | 6 (7th) | 0.26601 (s = 147 990 vs r = 185 444; v_in 119.3 m/s) |
| 0.9774 | 0.32580 | 6 | 6 (7th) | 0.31880 (s = 173 350 vs r = 181 253; v_in 138.0) |
| 0.5 | 0.16667 | 13 | 13 (14th) | 0.13312 (v_in 31.4) |
| 0.05 | 0.016667 | 132 | 132 (133rd) | 0.07407 (v_in 1.76) |

Entry speeds at chord 1: 800, 705.40, 604.62, 496.82, 380.94, 255.66, 119.32. So the chord-0.05 column cannot fit the 30×14 grid: a scenario has to cap the column length and then check "passes, exits at v = …", or use a hand-extended column. Over a column the passed cells together lose chord × n / 3 (2.00, 1.955, 2.167, 2.2 cell-integrities).

## 2. Entry speed into the first magazine cell
| case | entry v (m/s) | det. at 200 | at 400 | at 600 |
|---|---|---|---|---|
| (a) M, one hold | 705.40 | yes | yes | yes |
| (b) M, two holds | 604.62 | yes | yes | yes |
| (c) M, one crewed cell | 333.29 | yes | no | no |
| (d) M, 0.2 m plate on the wall | none: s0 1.568e6 < r 2.426e6, stops in the plate (plate loses 0.2154; round f = 0.518, not wrecked) | no | no | no |
| (e) L, one crewed cell | 488.86 | yes | yes | no |

Entry speed = (p on entering)/m. "Enter" is judged at the first magazine cell; a round that stops in the plate never enters.

## 3. R1 attacked from −y at its magazine
Column x = 7 or 8 (the aim is a cell centre, the line is parallel to the cell axis to within ~0.15 m over the path, so chord ≈ 1 − 1e-4): from −y the line meets hold (x,0), hold (x,1), then the magazine's first cell (x,2). R1 has no plates (R1c/R1d do). Hull plating: radiators and RCS are fittings with no σ on a path.

Shield off (my assumption; the brief does not say): shot 1 passes both hold cells (each −1/3) and enters the magazine at **604.6 m/s ≥ 400: the first round detonates it**, at t = time of flight (~1.1 s) after the first shot. Cells (8,x) and (7,x) give the same numbers.

Blast (§13d.1, q_b = 100 J/kg): capacity = Σ cells × 100 × cell mass: magazine 1.2 MJ, hold 1.2, bridge 5.92, reactor 60, beam bay 2.2 (5500 kg cells), quarters 8.88, turret 5.92, engine 3.42, heat sink 1.72 (cell 4290 kg with its water; 1.43 if 3575), shield generator 4.0: **ΣB ≈ 94.5 MJ**. The magazine holds 150 rounds: 900 MJ (6 MJ charge each), or 1.2 GJ if HE (+2 MJ each). E ≫ ΣB: the wave front reaches every room, absorbed = ΣB, escaped ≈ 805 MJ (or 1.1 GJ), **every cell is destroyed**, all crew die, nothing is left to be a fragment.

How it ends: by §13l.1 "Destroyed … too many pieces", largest fragment 0 < 0.5 × mass at undock, **destroyed, not Disabled**, in the step of the blast. The reactor's cells are all destroyed (4/4 ≥ 0.5 breach fraction), so the breach countdown (10 s) would start, but the pieces rule ends the battle first; I cannot tell from the documents whether a fully destroyed reactor room still raises an explosion event, and the order inside `checkEnd`. Disabled needs 10 s without an able weapon and cannot come first. Fewer than about 16 rounds (AP) or 12 (HE) would not wreck the ship: 94.5 MJ / 6 (or 8) MJ.

Shield on: a field at the entry point (generator room centre (20, 5) m; r = 18.2 m for x = 7, 23.1 m for x = 8; g = 1/(1+(r/40)²) = 0.828 / 0.751) removes g × 1.04546e6 × A of sectional momentum, 3200 g N·s: p falls to 2149 (col 7) or 2398 N·s (col 8) before the holds, i.e. v ≤ 358 / 400 m/s even with no screen, and ~162 m/s through two holds. **No detonation by speed, ever, in column 7** (the magazine is killed only by rounds destroying cells, which no longer detonates it). The shield state of the target is the case's setting; the brief leaves it open (I could not decide it blind).

## 4. Heat split by energy
Round mass m is constant (no ablation). Entry i takes impulse p_i − p_{i+1}, with energy share **E_i = (p_i² − p_{i+1}²)/(2m)**, p_{n} the momentum leaving (0 if stopped; the stop's remaining momentum goes into the stop cell). Σ E_i telescopes to (p0² − p_exit²)/2m, the round's lost kinetic energy. On a hull at rest the hull gains J²/2M with J = p0 − p_exit, so the **heat is Σ E_i − J²/2M**; the energy shares are of Σ E_i (the round's loss), with the hull's gain booked separately, so Σ heat + hull gain = round's loss to 1e-9 × gross. Example, 7-cell hold column (stops in the 7th, chord 1): E_i = 0.4272, 0.3960, 0.3562, 0.3052, 0.2393, 0.1534, 0.0427 MJ (sum 1.920 MJ = ½·6·800²); impulse shares would have been 11.8 %, 12.6, … 14.9 %; energy shares are 22.3 %, 20.6 … 2.2 %. Hull gain on R1 (950.5 t): 12.1 J.

## 5. An unmanned room
A turret that keeps its cells but has lost all crew: **cannot**: fire (no function, as if shut down), draw working power, make working heat, be crewed again (deaths are permanent; an overheated turret restarts, this one never does). **Can**: stay a cell with its σ (592 kg/m²) in the round rule, absorb blast (integrity × q_b × mass), carry live walls (power, control, structure, ammunition pass through it), keep its ready rounds as mass, keep life support and be repaired as cells. Position in the able rule (§13l.1 order destroyed, control, shut down, active, power, ammunition): §13n.1 says it joins "after `heat`". `heat` is not in §13l.1's list; I read it as the cause of the "shut down" condition, so **unmanned sits after shut down and before active**. Consequence: a crew that died at critical heat (380 K) was already above overheated (350 K, shut down) and cannot restart until below hot (330 K); the first failing condition when the last weapon goes is then **shut down (heat)**, not unmanned; `crew-died` is the parent only when the room is cool (crew killed by blast or cell loss with the cells intact). A ship with no crew anywhere: no able weapon, Disabled after 10 s, not destroyed.

## 6. The two-ship books
Must close, summed over both bodies, debris, rounds in flight, `left` and any mass joined: **linear momentum** and **angular momentum** (one common origin, spin included) against thrust/RCS/recoil, each at 1e-9 × gross; and **energy**: KE of bodies, debris, rounds and spin + heat stored + radiated + `left` = sources, at 1e-9 × gross (the existing angular tolerance is 1e-9 × net angular impulse + 1e-12 × gross impulse, §13f.1; the row says 1e-9 × gross; the ledger should name which). Energy sources: the shot (muzzle energy = round KE + recoil energy ½m u² + J²/2M), engine/RCS work if they fire; each hit's loss = heat + hull gain (J²/2M + L²/2I). For angular momentum to close the impulse must be applied at the **round's actual position on its line of action** (the midpoint of its chord through the cell, or the plate crossing), with the relative velocity taken at that same point (#242) and the torque (P − r_cm) × J about the centre; at the cell centre the torque is off by up to J × (edge/2) per hit (a 4800 N·s hit at 2.5 m off-line = 1.2e4 N·m·s). A stopped round's mass must join the body **at that point** (inertia m d², angular momentum conserved), not at the cell centre.
