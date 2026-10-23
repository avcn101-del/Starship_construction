# Physics checker, phase 1 (blind) — PR #78, L5m

Derived from CONSTANTS.md, DESIGN.md §13f/§13i/§13l/§13c and DECISIONS.md only (script: my own, not committed). Caveat stated up front: #285 and #286 as I read them already print some of the engineer's/lead designer's numbers (R1 911.2 t, R1c 1225.234 t, R1d 1421.484 t, 469 m/s, bridge shutdown 22.98 s); I derived mine from the constants and compare after.

Assumptions: T1, edge 5 m, cell area 25 m². Contents are spread uniformly over their room's cells (magazine 900 kg, turret 4 x 6 kg, sink water per cell). Fittings and plates are point masses at their segment's midpoint. Thrust of one engine = `engine.thrust` (footprint factor 1, all cells standing, full power). The shield is ignored (off) in every beam/round case.

## 1. Masses at undock
Heat sink cell = 3000 + 4 x 1 350 000 / 4186 = 4290.014 kg (water 1290.014 kg/cell). Cells: engine 6 x 5700 = 34 200; reactor 4 x 150 000 = 600 000; bridge 4 x 14 800 = 59 200; magazine 4 x 3000 = 12 000; beam bay 4 x 5500 = 22 000; heat sink 17 160.057; quarters 6 x 14 800 = 88 800; turret 4 x 4975 = 19 900; shield 4 x 10 000 = 40 000; hold 4 x 3000 = 12 000. Cells 905 260.057 kg. + magazine rounds 900 + turret rounds 24 + 17 radiators 4250 + 4 RCS 800.
- **R1 = 911 234.057 kg**
- Plate = 0.2 x 7850 x 25 = 39 250 kg. **R1c = 911 234.057 + 8 x 39 250 = 1 225 234.057 kg**
- **R1d = 1 225 234.057 + 5 x 39 250 = 1 421 484.057 kg**

## 2. R1c: centre, inertia, acceleration
Centre of mass (x forward, y, from the grid origin): **(27.5320, 15.5979) m**. I about it = Σ m(a²/6 + d²) over cells + Σ m d² over point masses: **I = 1.68921e8 kg m²**. a = 15e6 / 1 225 234.057 = 12.2429 m/s² = **1.2484 g**; the thrust line (y = 15 m) is 0.598 m below the centre.
Also: R1 centre (23.2357, 15.8040), I 9.33261e7, 1.6786 g; R1d centre (30.2888, 17.0340), I 2.59380e8, 1.0760 g.

## 3. M round through an M turret
Round: 6 kg steel, d = (m / (ρ π/4 · 4))^(1/3) = 62.43 mm, L = 249.7 mm, A0 = 3.0609e-3 m², S = c ρ L = 3.0293e6 kg/(m s), p0 = 4800 kg m/s, p0/A0 = 1.5682e6.
- Turret cell σ = (3000 + 1975) / 25 = **199 kg/m²**; r = c σ = 3.0753e5.
- Cell 1: s = 1.5682e6 > r, f + r/S = 0.1015 < 1: passes, p = 3858.7, f = 0.1015 (v = 643.1 m/s). Cell 2: s = 1.1327e6 > r: passes, p = 2811.0, f = 0.2030. **Passes both; exit speed 468.5 m/s.** Each cell loses 1/3.
- Against a 0.2 m plate first: σ = 1570, r = 2.4262e6 > s = 1.5682e6: **stops**; the plate takes s: loses (s/r)/3 = **0.2154**; f of the round = s/S = 0.5177 (not wrecked, stopped).

## 4. R1 from +y, column x = 8
Turret cells (8,5), (8,4), then magazine (8,3). The round at 800 m/s enters the turret, passes both cells (3 above), and **enters the magazine at 468.5 m/s ≥ 400: it detonates** (rule (c): the speed on entering, whether it stops or passes). A crewed 14 800 kg cell would instead have given the 333 m/s of the constant's note.

## 5. Beam (5 MW) on R1's bridge from −y
Beam energy: R1's bay N = 2: E = 10 MeV/m x 10 m = 100 MeV; Bethe (my integration) range in iron to 1 MeV: **113 kg/m²** < the bridge cell's σ = 592: the proton stops in the first cell it meets, F = 1 for that cell. Below the bridge (x = 5, 6; y < 2) nothing stands: open from −y. Column x = 5: bridge (5,2), (5,3), then quarters (5,4).
- Burn-out per bridge cell: q x m = 3000 x 14 800 = **44.4 MJ** (8.88 s at 5 MW). Heat per cell to 350 K: 600 000 x 60 = **36 MJ**. So per cell the heat to overheat is less than the burn-out; but the destroyed cell takes its heat share and capacity with it at unchanged T (§13f.1), so the room's C falls as it burns: compare cumulatively, not per cell.
- Sources/sinks I take: beam 5 MW all heat in the bridge; bridge draw 100 kW as heat (upper); no radiator (inside); life support (≤ 50 kW per standing cell above 295 K) and conduction (25 W/K/m) only slow it, so the bound drops them.
- Beam stays on the bridge and re-aims at its next standing cell (my reading of "first surviving cell"): cell 1 out at **8.88 s** (T = 308.5 K, 3 cells), cell 2 at 17.76 s (T = 333.2 K, 2 cells), the third cell then takes 4.03 s of its 8.88 s to bring T to 350 K: **overheat shutdown ≥ 21.80 s** after the beam starts (21.52 s with the 100 kW draw counted), plus slew/aim time I cannot know. At that time: **2 cells destroyed, 2 standing (the third burnt 45 %)**. Shuts down by heat **before** the bridge is destroyed.
- If instead the beam stayed in column 5 it would pass on to the quarters after two bridge cells, and the bridge would peak at **≈ 333 K (< 350 K): no heat shutdown** by the beam alone. Whether the scenario re-aims on the bridge decides it.

## 6. T-gun's turret under the beam from +x
Turret σ = 199 > 113: first cell (9,4) takes all. Burn-out per cell: 3000 x 4975 = **14.925 MJ** (2.985 s); heat per cell to 350 K: 36 MJ. Cumulative with re-aim: T after cells 1–4 = 296.2, 304.5, 316.9, **341.8 K** (all four cells destroyed at 11.94 s, never reaching 350 K; 8.2 K margin; 200 kW turret draw adds ≈ 1–2 K). With no re-aim, two cells burn (≈ 304.5 K) and the beam moves to the quarters. **Burns out before it overheats** in both readings.

---

# Physics checker, phase 2 — PR #78 (head `5d79ae7`)

Read: PR body and both engineer comments, the seven scenarios and their records, `js/rooms.js` (`cellMassOf`, `fireBeam`, `heatRate`, `damageCell`). Probes were runs of the kernel with run-time overrides, nothing recorded or edited (`withOverrides({'repair.massRate': 1e-9})`).

## Result: 0 blocking findings; 0 expected values differ from my derivation; 2 differences of mine explained; 5 non-blocking findings

### Where my phase 1 differed, explained
1. **Moment of inertia (1.2e-4 relative).** I spread the magazine's 900 kg and the turret's 24 kg over their cells; the scenarios put each at its room's centre ((40,15), (45,25)). With that placement I reproduce, from my own model, every literal: M (to 1 ulp), centre (27.532009859471717, 15.597918878400893), I(R1) 9.33145522e7, I(R1c) 1.68909391e8 (168909391.43380326 vs the file's 168909391.4338033), R1 g 1.6785745738499083, turn 3.4243616150902207 s, recoil −0.0641472076627804 deg/s (identical to the digit). Physics unchanged; **finding F1**: §13f.1 says "point masses for contents" but not where; the room centre is the kernel's choice and should be written in the document.
2. **Beam timing.** My phase 1 had no repair. The kernel's burn-outs are 12 % slower than q·m/P (bridge cell 1 at 9.967 s vs my 8.880; T-gun turret cell 1 at 3.350 s vs 2.985) while the room heats at the full 5 MW (first bridge burn-out T = 310.5 K, my 5 MW sum 310.8 K). Cause: the quarters' repair field, `repair.massRate` 200 kg/s, heals the burning cell (200/14 800 = 0.0135 integrity/s on the bridge, 200/4975 = 0.0402/s on the turret, about 0.91 of full strength at that distance). Confirmed: with `repair.massRate` ≈ 0 the kernel gives bridge cells at 8.900 s and 17.950 s, shutdown 22.117 s (my bound ≥ 21.52 s + about 0.4 s), and T-gun cells at 3.017, 6.017, 9.183, 12.183 s, peak 341.91 K (my 341.8 K). With repair the kernel's 22.98 s = 9.967 + 9.983 + 3.03 s matches my cumulative model with the heat per cell raised to P × (burn time): 310.8, 338.5 K, then 12.3 K × 1.2 MJ/K at 5.1 MW = 2.9 s. So 22.98 s is right, **2 destroyed / 2 standing at shutdown is right**, and the beam does re-aim on the next standing cell.

### Scenario by scenario
- **`L0.turret.mount`**: σ 199, r 307 527.5, passes both, exit 468.507 m/s, plate r 2.426222e6 > s0 1.568183e6 stops: all equal to my phase 1. The closed form is the document's rule, not a restatement of code, and the literal is checked at 1e-3. **F2 (gap)**: `cells` is returned but not compared: the document's losses (each passed turret cell 1/3, so 0.6667 each; the plate 1 − 0.2154 = 0.7846; the stopped round f = 0.5177) are not checked, only "turret cells untouched" in the plate case. Add them: they are derived from §13i.1.
- **`L3.r1.pinned.v2`**: four literals equal mine (item 1). The turn is independent of the centre (couple 5e7 N m: engine top RCS and bay bottom RCS) and recoil uses I' after the round leaves with 3 rounds at (45,25): reproduced. Meaningful: each literal derives from the cell sums written in the file.
- **`L3.r1c.props.v2`**: intact case equals mine. Wrecked case: 4 × 0.2154 = 0.862 < 1, 5 × 0.2154 > 1: a hole after 5 rounds ✓. Note the acceleration literal 1.24839 is checked at 5e-6 absolute against 1.2483936: slack 1.4e-6; fine, `L3.r1.pinned.v2` pins g at 1e-6 relative.
- **`L4.readout.blueprint.v2`**: R1 911 234.057 and R1c 1 225 234.057 equal mine. The literal is a typed cell sum (independent of `cellMassOf`); before = after is meaningful for #225 (5).
- **`L4.route.missionKill.v3`, R1 case**: loss 331.493 m/s per two turret cells, entry 468.507 − (800 − v_rel) ✓ equals my 468.5; the loss is independent of speed (A and f depend on r/S only) ✓. Detonation at ≥ 400 ✓. **R1d case**: kernel-read pins (shot-26, step 3066, Disabled 3666). I did not hand-derive 26 shots; sanity: at turret.fireRate 0.5/s shot 26 leaves at 50 s and arrives after 900/800 = 1.1 s, step 3066 = 51.1 s ✓; the +600 steps = 10 s / dt ✓. Honestly labelled as kernel-read.
- **`L4.route.overheat.v3`**: the bound 14.118 s is valid (surviving cells need ≥ 2 × 600 000 × 60 = 72 MJ, input ≤ 5.1 MW, and a destroyed cell takes its share away at constant T), the premise (walls only remove heat) holds. It is **weak (F3)**: 14.1 s against 22.98 s, so it cannot notice a wrong `matter.burnEnergyPerKg` or cell mass. A tighter hand-worked bound from the same constants exists: two cells must burn (2 × q × m = 88.8 MJ) before the third takes the room past 350 K: t ≥ 21.5 s without repair. The pinned steps 1379/1979 are kernel-read, labelled. **T-gun case**: asserts only "no shutdown event, destroyed". **F4 (design-relevant)**: with repair the turret's temperature peaks at **347.68 K** just before the last cell falls (13.5 s), **2.3 K below** `crewedOverheated` 350 K (341.9 K without repair); the route "burns out before it overheats" holds only through life support and the repair field's lengthening of the burn. Cumulatively ΔT = Σ q m / (k C) for k = 4..1 = 51.8 K ideal (burn energy per cell 14.925 MJ, heat capacity 0.6 MJ/K per cell); with `turret.machineryMass` at its range maximum 2500 it is 57.3 K ideal, still below 60 K. The scenario has no temperature check; I suggest the peak-temperature bound (< 350 K, and the derived 51.8 K ideal) so a change of constants that flips the route fails here and not silently.
- **`L4.cascade.v4`**: structural (event tree); B2 and B4 now use the routes above; no physics literal of its own. Consistent with the two route scenarios.

### Other findings
- **F5 (pre-existing, made visible by this PR)**: `thermal.coupledCrewed` 0.6 MJ/K per cell is 121 J/(kg K) for the turret's 4975 kg and 41 J/(kg K) for the bridge's 14 800 kg, against 450 J/(kg K) for steel in the plate, armour and engine rows. At the mass-consistent 450 J/(kg K) the bridge cell would be 6.7 MJ/K and the overheat-through-the-bridge route would not exist (44.4 MJ of burn heats a 4-cell bridge by 6.7 K). The route therefore rests on a capacity constant with "no source found" (#243), not on the new mass. Not a defect of PR #78; a decision for the lead designer, the same family as 13l.1's stated stand-in for plate heat. `js/rooms.js` `heatRate` is otherwise right: bridge draw × surviving fraction; the turret generates only `heatPerShot` when not holding, so there is no 200 kW draw in the T-gun case (my phase 1 allowed it; no effect).

### Answer to the engineer's question 1 (bound)
P_beam + P_own is correct and the stronger P_beam-only form is not true as stated (the bridge's 100 kW is heat); either passes. Both are valid lower bounds.
