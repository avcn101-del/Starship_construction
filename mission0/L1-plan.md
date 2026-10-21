# Mission 0, L1 (one room alone) — plan

**Status: proposal by the lead designer, 2026-10-21, awaiting the owner.**
When approved it becomes decisions #180–#184 in `DECISIONS.md` and the L1
paragraphs of `DESIGN.md` §13, and this file is deleted. Nothing here is
built before that (`CLAUDE.md`, Agents). Numbers are T1, size M, SI.

## 1. What L1 proves

L0 proved the materials. L1 proves that **each room alone** behaves as its
laws say, over time, at the simulation step (1/60 s, #175): heat per room
with three thresholds (#18b), radiators by T⁴ (#143), the reactor's
fail-safe chain (#81), the magazine as a bomb (#91), the turret's rate and
recoil, the shield generator's heat (#21, #139), the engine's thrust and
heat, the crew quarters as crew capacity and repair field (#51, #60, #99),
the bridge's control and backup supply (#147). Every number enters
`data.js` with a range (§4 below); every effect raises an **event with a
cause id** (#156), which L1 fixes once so the kernel need not change later.

Rooms at L1: the eight of #127 (reactor, radiator as the fitting that acts
on a room, magazine, kinetic turret, shield generator, engine, crew
quarters, bridge) **plus the beam bay**, added because its heat is the
Furnace's whole mechanic and the throughput law's main heat source; it is
one more scenario on the same heat model.

## 2. The heat model (new kernel model, `js/heat.js`)

| Rule | Statement |
|---|---|
| State | Each room stores heat Q (J); its temperature is T = Q / C, absolute, with C = cells × `thermal.heatCapacityPerCell`. Rooms start at `thermal.restTemperature` (290 K). Space is at 3 K, taken as 0 |
| Generation | Each room adds the heat its state generates (reactor: heatPerPower × delivered power; beam bay: draw − beam power; shield generator: draw + absorbed; engine: draw × heatFraction; turret: heatPerShot per shot; bridge and quarters: their draw) |
| Radiator | A radiator on a hull segment of a room radiates εσA T⁴ of **that room's** heat (Stefan–Boltzmann, real σ, ε = 0.9). Its IR brightness is the same number (#102, #143) |
| Conduction | Between rooms through shared walls: **L2**, not L1 |
| Thresholds | Per room class, three temperatures: **hot** (function degrades: not modelled at L1 beyond the event), **overheated** (the room shuts itself down: no function, no own heat; it restarts when T falls below hot), **critical** (the crew in the room die; a magazine cooks off; a reactor melts down) |
| Two classes | **Plant rooms** (reactor, beam bay, shield generator, engine): hot 600 K, overheated 800 K, critical 1000 K. Their temperature is the plant's working temperature; the crew at their stations die when the plant is critical. **Crewed rooms** (bridge, crew quarters, turret, missile bay, empty hold): 330 / 350 / 380 K. **Magazine**: 330 / 350 / 450 K (cook-off). Consequence, measured at L2: a crewed room sharing a wall with a working reactor cooks unless a hold insulates it (#18c), which is the intended layout pressure (#18, #52) |
| Integration | Explicit Euler at `simStep`; stable while dt × 4εσAT³ / C ≪ 1 (2e-3 at 1000 K with the values below) |
| Invariant (E2, counts for E3 now, #174) | Per room and per run: heat generated = heat radiated + heat stored, to 1e-9 relative |

Cells have an **integrity** in [0, 1]: a cell a round passes is 0
(destroyed); a blast lowers it by absorbed energy / resistance (L0's
"damaged"); repair raises it (§3.11). **Crew die per destroyed cell**
(`crewPerCell` of the room's crew each, #49 refined) and all at once at
critical heat (#18b).

## 3. Scenarios (ids, expected formula, criterion)

Conventions as in L0 v2 (#176): inputs from `data.js`; threshold crossings
are **one-sided**, expected ≤ actual < expected + dt; closed forms to 1e-9
relative unless stated; no case sits exactly on a threshold unless it tests
that threshold (#177). Tier sweeps T1–T6 use the scaling exponents of §4.
Every scenario also checks the heat invariant, no NaN, and that every event
carries time, room, cause id and the fields of #156.

| # | Scenario | Setup and measure | Expected (formula) and criterion |
|---|---|---|---|
| 1 | `L1.radiator.cooling` | a hull room (idle turret) at T0 ∈ {400, 600, 800, 1000, 1200 K}, n ∈ {1, 2} radiators, no generation, 60 s; tiers at T0 = 1000 K | T(t) = (T0⁻³ + 3 n εσA t / C)^(−1/3); relative error ≤ 1e-3; radiated + stored = initial heat to 1e-9 |
| 2 | `L1.radiator.steady` | the same room with generation P ∈ {0.1, 0.5, 1, 2 MW}, n ∈ {1, 2, 4}, run 3600 s (cases with T_ss below critical only) | T_ss = (P / (n εσA))^(1/4); \|T(3600 s) − T_ss\| / T_ss ≤ 1e-3; radiated power at the end = IR brightness = P within 1e-3 |
| 3 | `L1.room.thresholds` | each of the nine rooms heated by an external P (no own generation, no radiator) | t_x = C (T_x − T_rest) / P for hot, overheated, critical, one-sided; events in that order; at critical the room's crew die (deaths = crew housed or required); the magazine cooks off; the reactor melts down |
| 4 | `L1.reactor.power` | reactor at demand d ∈ {0, 0.25, 0.5, 1} of `reactor.power`, no radiator; tiers | delivered = d P exactly (demand-driven); heat rate = h d P; time to overheated one-sided; at overheated it shuts down: delivered = 0 within one step, decay heat begins |
| 5 | `L1.reactor.scram` | running at full from T_s ∈ {rest, 600 K} (and idle from rest); control cut at t_s; cause id 'control-loss' (EMP later uses the same path) | delivered → 0 within one step; decay heat P_d(t) = f h P e^(−t/τ); heat added by t = f h P τ (1 − e^(−t/τ)) to 1e-3; **no decay heat from an idle reactor**; meltdown iff C (T_crit − T_s) < f h P τ, at t = −τ ln(1 − C (T_crit − T_s) / (f h P τ)) one-sided (yes from 600 K, no from rest with the values of §4); the explosion event carries `reactor.explosionEnergy` |
| 6 | `L1.reactor.breach` | destroy cells one at a time; M (4 cells) and L (9 cells) | the countdown starts at the cell that makes destroyed / total ≥ `reactor.breachFraction` (this **is** the threshold test: 2 of 4, 5 of 9); the explosion comes `reactor.breachCountdown` later, one-sided, with `reactor.explosionEnergy`; a reactor destroyed entirely explodes at once |
| 7 | `L1.magazine.cookoff` | contents by mass ≤ `magazine.capacity`: all AP, all HE, half and half, size S and L, half full; heated by P; also destroyed by damage; tiers | counts = floor(capacity / round mass of the size) (150 M, 506 S, 44 L at T1); explosion energy = n_AP × charge + n_HE × (charge + `he.blastEnergy`), sizes scaled by (2/3)³ and (3/2)³, exact; cook-off at t = C (T_crit − T_rest) / P one-sided; the event carries energy and the cause ('heat' or the damaging hit) |
| 8 | `L1.turret.fire` | ammunition n ∈ {5, 150}; measured at t ∈ {1, 9.5, 99.5, 399.5 s} (never on a shot time); powered and unpowered; tiers (rate k = −1) | shots = min(n, 1 + floor(rate × t)); recoil impulse = shots × m v with m from `roundGeometry`, exact; heat = shots × heatPerShot; energy drawn = draw × time while able to fire; dry or unpowered → ceases fire (event) |
| 9 | `L1.shield.generator` | generator on, beam P_in ∈ {2, 5, 10, 30 MW} at the generator (strength 1); powered and unpowered; tiers | absorbed rate = min(P_in, budget) (L0); heat rate = draw + absorbed; time to overheated one-sided; after shutdown passed = P_in and heat rate 0; unpowered: field off from the start; EM signature while absorbing = absorbed power |
| 10 | `L1.engine.thrust` | throttle u ∈ {0, 0.5, 1}; ship mass given as m ∈ {1000, 1500 t}; powered, unpowered, uncontrolled; tiers | thrust = u F; draw = u D; heat rate = u D h; a = u F / m exact; no power or no control → thrust 0 and draw 0 (#4d); time to hot at full throttle one-sided |
| 11 | `L1.quarters.repair` | quarters with c ∈ {6, 3, 1, 0} surviving cells; one target room with one destroyed cell at r ∈ {0, 0.5, 1, 2, 4} × radius | housed crew = crewPerCell × c, deaths per destroyed cell = crewPerCell; repair rate = `repair.rate` × (c / 6) × g(r), g(r) = 1 / (1 + (r / radius)²) (#99, as the shield); time to integrity 1 = 1 / rate', one-sided; c = 0 → no repair |
| 12 | `L1.bridge.control` | bridge with reactor power on, cut, and destroyed cell by cell | control = true while any cell survives; power cut → still true (backup supply, #147); destroyed → false, event 'control-lost' with the destroying hit as cause; heat from its draw, time to hot one-sided |
| 13 | `L1.beambay.heat` | beam bay firing at full; powered and unpowered; tiers | draw = beam.power / efficiency; heat rate = draw − beam.power; times to hot and overheated one-sided; at overheated the beam stops (power 0, draw 0, event); unpowered → no beam |

Scenarios 4–13 depend on 3 (the thresholds) and 1 (the integrator); 9 on
`L0.shield.point.v2`; 8 on `L0.kinetic.penetration`. Expected formulas live
in the scenario files, so the lock covers them.

**What L1 does not test** (honest scope): conduction between rooms,
radiators cooling a reactor (the reactor is placed inside, so its heat
reaches a radiator only through walls: L2), the repair budget shared among
rooms (L2), recoil spin and CoM (L3), control paths through the structure
graph (L3), ammunition feed through walls (L2), the "hot" degradation of
function (no model yet; the event only).

## 4. Constants and approved ranges proposed (T1, size M; k on the cell edge)

Rate-like constants of a room (power, draw, thrust, budget) belong to its
footprint: an L room (3×3) has 9/4 of the M value, which is `sizeLinear.L`²
and the same rule as the beam and shield at L0.

| Constant | Value | Range | k | Note |
|---|---|---|---|---|
| `FIXED.stefanBoltzmann` | 5.670374e-8 W/m²K⁴ | fixed | — | real |
| `FIXED.restTemperature` | 290 K | fixed | — | rooms start here |
| `radiator.emissivity` | 0.9 | fixed | — | real, a dark panel |
| `thermal.heatCapacityPerCell` | 6e5 J/K | 2e5–2e6 | 3 | sets the pace of every heat race: an M beam bay alone reaches hot in 99 s and shuts down at 163 s |
| `thermal.plant.hot / overheated / critical` | 600 / 800 / 1000 K | 450–750 / 650–950 / 850–1300 | 0 | reactor, beam bay, shield generator, engine |
| `thermal.crewed.hot / overheated / critical` | 330 / 350 / 380 K | 320–350 / 340–380 / 360–420 | 0 | bridge, quarters, turret, missile bay, hold |
| `thermal.magazine.hot / overheated / critical` | 330 / 350 / 450 K | 320–350 / 340–380 / 400–500 | 0 | critical = cook-off |
| `radiator.area` | 25 m² | 10–100 | 2 | one panel per 5 m segment; 165 kW at 600 K, 523 kW at 800 K, 1.28 MW at 1000 K |
| `reactor.power` | 20 MW | 5–50 | 2 | electric, delivered on demand; k = 2 matches its consumers (beam, shield, engine), so a layout's power balance is tier-invariant; the square–cube law lives in mass and hull area (#63), not here |
| `reactor.heatPerPower` | 1.0 | 0.5–3 | 0 | waste heat per delivered watt |
| `reactor.decayFraction` | 0.07 | 0.03–0.15 | 0 | decay heat at SCRAM as a fraction of the thermal power at SCRAM (real: ~7%) |
| `reactor.decayTime` | 900 s | 300–1800 | 0 | exponential decay (the real power law borrowed in shape, #4); 1.26 GJ in total: a reactor SCRAMmed hot melts down in ~21 min without cooling, one SCRAMmed from rest never does, so EMP disables without destroying (#82) |
| `reactor.breachFraction` | 0.5 | 0.25–0.75 | 0 | destroyed cells that start the countdown |
| `reactor.breachCountdown` | 10 s | 3–30 | 0 | #81 |
| `reactor.explosionEnergy` | 200 MJ | 50 MJ–1 GJ | 3 | breach and meltdown; a full HE magazine is 375 MJ |
| `beambay.efficiency` | 0.4 | 0.2–0.8 | 0 | draw = beam power / efficiency; the rest is heat (7.5 MW for the M beam) |
| `shield.powerDraw` | 2 MW | 0.5–10 | 2 | while on; becomes heat, plus everything absorbed |
| `engine.thrust` | 8 MN | 2–30 | 2 | two M engines give a 1500 t corvette ~1 g (#54); k = 2 makes big ships sluggish (a ∝ 1 / edge) |
| `engine.powerDraw` | 10 MW | 2–40 | 2 | thrust and power are independent constants: ships have no propellant (#140) |
| `engine.heatFraction` | 0.3 | 0.1–1 | 0 | |
| `turret.fireRate` | 0.5 /s | 0.2–2 | −1 | big guns fire slower; momentum per second then scales k = 2 like the beam |
| `turret.powerDraw` | 200 kW | 50 kW–1 MW | 2 | |
| `turret.heatPerShot` | 0.3 MJ | 0.1–1 | 3 | |
| `kinetic.chargeEnergy` | 0.5 MJ | 0.2–2 | 3 | propellant energy per M round (its muzzle energy is 160 kJ); an AP magazine explodes by this alone, HE by this plus the warhead (#91) |
| `magazine.capacity` | 75 kg | 25–250 | 3 | 150 M rounds: 5 min of one turret firing freely; #92 is tuned at L4 |
| `quarters.crewPerCell` | 3 | 1–8 | 2 | 18 crew in a T1 quarters, 648 at T6 (#65) |
| `quarters.powerDraw` | 50 kW | 10–200 | 2 | |
| `repair.rate` | 0.02 /s | 0.005–0.1 | 0 | integrity per second at the generator with all cells surviving: 50 s per cell |
| `repair.radius` | 30 m | 10–80 | 1 | half-strength radius, exponent 2 (#99, like the shield) |
| `bridge.powerDraw` | 100 kW | 20–500 | 2 | from the backup supply when the reactor is cut; the backup has no limit (#147) |
| `rooms.<type>.crewRequired` | bridge 4, reactor 4, engine 2, magazine 2, shield 2, beam bay 3, turret 3, railgun 4, missile bay 3, quarters 0, hold 0 | 1–3× | 2 | data at L1; measured at L3 (validation, #60) |

Reading at T1 with these values (what the engineer should see): a reactor
alone at full power overheats in 61 s, so power on demand and conduction
to radiators (L2) are what keep a ship alive; the beam bay is the heat
problem (163 s to shutdown); a turret firing freely is not, within a
battle (hot after 11 min, its crew cooked after 24 min); a shield generator
under an M beam shuts down after 175 s; engines run a whole battle (6 min
to hot). Crewed rooms radiate almost nothing (15 kW per panel at 330 K):
their heat has to reach a plant room or stay small, which L2 measures.

## 5. Kernel and tools for L1

- `js/heat.js`: room heat state, generation, radiator step, thresholds and
  events. `js/rooms.js`: rooms built from `data.js` (footprint, class, crew,
  draws), power and control state, the behaviours above. `js/events.js`:
  the event list; every event has `t`, `type`, `room`, `cause`, and the
  fields of #156 where they apply (`energy`, `crew`, `channel`).
  `data.js` gains a `ROOMS` table and the groups above. `DESIGN.md` §14
  lists `rooms.js` under the kernel.
- `tools/m0.js`: from L1 the lock hash covers **the whole scenario file
  except its `locked:` line** (the v2 review's coverage gap); L0 locks stay
  as they are. `shield.kineticStop` is derived inside `withOverrides` so
  kinetic overrides reach it (#171 as intended). `blast()`'s coupling
  argument becomes required. The `approved` flags of #177 flip to true.
- Process as in L0: scenarios written and run only for crashes, committed,
  **locked in a commit of their own**, then the first canonical run; one
  branch `m0/l1-rooms`, one pull request; the reviewer and the physics
  checker run on it; the owner approves; Claude merges (#178).

## 6. Questions the owner decides (recommended answers first)

1. The two threshold classes and the "working temperature" reading of a
   plant room (§2). Recommended: yes; L2 measures whether the layout
   pressure is too harsh and tunes conduction there.
2. The beam bay joins L1 (not in #127's list). Recommended: yes.
3. `reactor.power` scales k = 2, not k = 3. Recommended: yes (see the note
   in §4); L6 measures the square–cube law on mass and hull area.
4. Crew die per destroyed cell, `crewPerCell` each, and all at critical
   heat. Recommended: yes.
5. The four process items of §5 (lock scope from L1, `kineticStop` inside
   `withOverrides`, required coupling, flags flipped) and, for L2, the blast
   closed forms `escaped = max(0, cE − N·B)`, `absorbed = min(cE, N·B)`.
   Recommended: yes to all.
