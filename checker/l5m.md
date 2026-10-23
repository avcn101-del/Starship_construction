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
