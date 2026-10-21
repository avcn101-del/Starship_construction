# Changelog

## 0.6.0 — 2026-10-21 — Mission 0: the mass pass, ships of real density (#221, #222)

- Data (#221, the owner; ranges by the lead designer): new
  `structure.cellMass` 1e4 kg per M cell at T1 (3e3–3e4 kg, k=3);
  `thermal.specificHeat` removed; `engine.thrust` 2 → 15 MN (4–60 MN, k=2);
  `rcs.force` 100 kN → 1 MN (0.3–5 MN, k=2); all approved.
  `ROOMS.shieldGenerator` is placed `anywhere` instead of carrying the
  `fittings` override (#219 (1), #222 (2)).
- Kernel (§13g.1): a cell's mass is `structure.cellMass` (scaled, k=3); a
  heat sink cell adds (`heatsink.capacityFactor` − 1) × C /
  `FIXED.waterSpecificHeat`; heat capacity unchanged. `readout` works on a
  blueprint before `enableShip` (#222 (4)); the `fittings` override is gone
  from `js/layout.js` and `js/rooms.js`. `tools/perf.js` takes the
  magazine's and the turret's loads from `data.js` (#222 (3)).
- `tools/m0.js`: a dependency on a withdrawn scenario, and the check of
  `mission0/withdrawn.json`, follow a chain of successors to the one that
  stands (v1 → v2 → v3, #188, #221).
- `tools/m0.js`: a case whose `expected()` throws is recorded as a FAIL
  with the error, like a `run()` that throws (#212 (7)): the superseded L3
  formulas name the removed `thermal.specificHeat`.
- Every L0–L3 record re-recorded for the new data. Results moved only in
  `L1.engine.thrust` and `L1.room.restart` (`engine.thrust` 2 → 15 MN, both
  still PASS) and in L3: the five v2 scenarios whose formulas compute mass
  from `thermal.specificHeat` (`L3.mass.props.v2` FAIL, its four dependants
  BLOCKED until their v3 successors pass), their v1 predecessors, and
  `L3.fragment.scram` (thrust and momentum residues; still PASS).
  `L3.validation.v2` and `L3.kinetic.hole` unchanged.
- `mission0/scenarios/L3/`: five v3 successors (`L3.mass.props.v3`,
  `L3.thrust.v3`, `L3.rcs.turn.v3`, `L3.recoil.v3`,
  `L3.split.momentum.v3`), each its v2 with only the mass rule changed, and
  the new `L3.fragment.rules` (#222 (1)); locked before their first
  canonical run: all six PASS. The five v2s are withdrawn as superseded by
  #221 (`mission0/withdrawn.json`); every L3 scenario re-run canonically
  through the new successors. `MISSION0.md` regenerated.
- `DESIGN.md` §16: the measured mass-pass block. `regress`: 56 VERIFIED +
  20 WITHDRAWN; `tools/perf.js` 0.05–0.16 ms per step.

## 0.5.1 — 2026-10-21 — L3 merged; reviewer answers (#222)

- L3 (PR #35, head `f8d31c6`) merged into `main` after the physics checker
  (#220) and the reviewer (#222) reported no blocking finding; `regress`:
  55 VERIFIED + 15 WITHDRAWN.
- `DESIGN.md` §13f.1: control needs a working bridge; §13g: the mass pass
  also carries `L3.fragment.rules` and three small fixes.

## 0.5.0 — 2026-10-21 — Mission 0 L3: the minimal ship (#208–#222)

- Data (#210, approved by the lead designer): `thermal.specificHeat`
  600 J/(kg·K) (400–900, k=0); `FIXED.waterSpecificHeat` 4186 J/(kg·K) and
  `FIXED.standardGravity` 9.80665 m/s²; `engine.thrust` re-tuned 8 → 2 MN
  (range re-approved 0.5–8 MN, k=2; #203 A); new `rcs.force` 100 kN
  (30–500 kN, k=2), `rcs.powerDraw` 200 kW (50 kW–1 MW, k=2), `rcs.mass`
  200 kg (50–1000 kg, k=3) and `radiator.mass` 250 kg (100–1000 kg, k=2).
  `ROOMS.shieldGenerator.fittings: true`: the engineer's reading of R1
  (§13f.2 puts six radiators on it, §13f.1 lists it as inside); a question
  in the L3 pull request. Every earlier record re-recorded for the new data
  hash (see the pull request for what moved).
- Kernel (§13f.1, #208): new `js/body.js` (mass properties from cells as
  squares plus point masses, the rigid body, semi-implicit Euler, impulses,
  the velocity field kept when a part leaves, momentum kept when rounds move
  inside, momentum books). `js/rooms.js`: `addFitting` (radiators and RCS on
  open edges, with mass), `enableShip`, engine thrust at the exhaust face,
  RCS forces through their host room (power, control, heat), recoil
  (−m u d at the turret, rounds in flight), turrets that hold fire, debris
  for every mass that leaves (a destroyed cell takes its heat with it,
  #214 (9)), fragments with the parent's velocity field, control over live
  walls with SCRAM on its loss (turrets, shields and beams now also stop
  without control), and the shipyard `readout` (#58). A destroyed cell
  resists no round (#212 (5)). `js/graph.js`: structure components, control
  reach, live walls only within a room's working fragment. `js/layout.js`:
  fitting rules and `validateShip` (#57). No earlier record moved.
- `tools/perf.js`: milliseconds per step for two R1s at T1 and T6 (E8, #213).
- `mission0/scenarios/L3/`: the nine scenarios of §13f.3 on R1, locked
  before their first canonical run: 65 of 68 cases PASS; 1 PASS, 2 FAIL,
  6 BLOCKED (see §16 and the pull request: two predicted specification
  differences and two float-scale flaws in the engineer's invariants).
  `DESIGN.md` §16 gets the measured L3 block; `MISSION0.md` regenerated.
- Fixes of #219 and #220: `js/body.js` and `fixtureImpulse` also book
  the gross angular impulse (`external.Hgross`, Σ |q × F dt|); no record
  moved. Seven v2 scenarios in `mission0/scenarios/L3/*-v2.js`: heat books
  within max(1e-9 × flow, 1e-10 × the room's starting heat), angular books
  within 1e-9 × net + 1e-12 × gross (#220 (1)); `L3.rcs.turn.v2` also
  asserts the discrete turn (122 + 122 firing steps, heading 1.576373 rad)
  and `L3.thrust.v2` (a) the discrete position (#220 (2)). Locked before
  their first canonical run: all seven PASS. The seven v1 scenarios are
  withdrawn under #188 (`mission0/withdrawn.json`, decision #219); the five
  recorded BLOCKED were re-run unchanged and hold FAIL with the same rows.
  `L3.fragment.scram` re-run unchanged: PASS. `DESIGN.md` §16 gets the v2
  results; `MISSION0.md` regenerated.
## 0.4.5 — 2026-10-21 — Ships of real density (#221)

- `DESIGN.md` §13g: the mass pass: 10 t per cell (the owner), heat
  capacity unchanged, thrust 15 MN and RCS 1 MN, estimates and the
  scenarios it supersedes.

## 0.4.4 — 2026-10-21 — Answers to the L3 physics checker (#220)

- `DESIGN.md` §13f: angular books 1e-9 × net + 1e-12 × gross; two v2
  files assert the discrete turn and the discrete position; a feed keeps
  angular momentum.

## 0.4.3 — 2026-10-21 — Answers to the L3 engineer (#219)

- `DESIGN.md` §5.2, §13f.1: the shield generator may carry fittings.
- `DESIGN.md` §13f.3: v2 successors for seven L3 scenarios (two criteria of
  the lead designer, the engineer's invariant scales).

## 0.4.2 — 2026-10-21 — A feel prototype after L3; fewer docs PRs (#217, #218)

- `CLAUDE.md`, `DESIGN.md` §15: after L3, a rough throwaway feel prototype
  in `proto/` for the owner's phone (the owner).
- Process: one documentation pull request per working block.

## 0.4.1 — 2026-10-21 — The D pass merged; reviewer answers (#216)

- The D pass (PR #24, head `4b754b1`) merged into `main` after the physics
  checker (#214) and the reviewer (#216) reported no blocking finding;
  `regress`: 46 VERIFIED + 8 WITHDRAWN.
- `DESIGN.md`: §13e.1 states the interim (a destroyed cell still resists
  until L3); §13f row 6 gets two cases for #207; §13d.1 notes the blast
  capacity of damaged cells from L4; §16's salvo wording corrected (#214).

## 0.4.0 — 2026-10-21 — Mission 0 D pass: real round sizes, partial damage, repair (#203 D, #206, #207)

- Data (#206, approved by the lead designer): `kinetic.roundMass` 6 kg
  (2–20, k=3), `armour.kineticResistance` 2.7e5 × 12^(1/3) (3e5–1.25e6),
  `room.kineticResistance` 6.75e4 × 12^(1/3) (7e4–3.2e5), both computed
  exactly in `data.js`; `magazine.capacity` 900 kg (300–3000),
  `ammo.wallFeed` 0.72 kg/(s·m) (0.24–3.6), `kinetic.chargeEnergy` 6 MJ
  (2–20 MJ); new `kinetic.hitsToWreck` 3 (1–8, k=0).
  `shield.kineticStop` stays derived from the S round (#171).
- `js/rooms.js`, `js/events.js`: partial kinetic damage (#206). `fireRound`
  sends a round along a path of room cells: each cell resists
  `room.kineticResistance` (L0's `penetrate`), a passed cell loses
  1 / `hitsToWreck` of its integrity, the cell it stops in (s_left / R) /
  `hitsToWreck`; a cell is destroyed at 0 (a residue of 1e-12 or less
  counts as 0). A damaged cell raises `cell-damaged` (channel, cell,
  integrity). Crew die in proportion to integrity lost: cumulative deaths
  floor(crew × (cells − Σ integrity) / cells), never more than the crew,
  never undone (a quotient within 1e-9 of a whole number counts as it);
  with whole cells destroyed this is L1's rule. Repair restores damaged
  cells only; a destroyed cell stays destroyed (replaces #190 (1)).
- `js/rooms.js`: life support under power routing (#207). With routing on,
  a crewed room or magazine counts as powered for life support while it is
  joined through live walls (through any rooms) to a reactor able to
  produce (switched on, not shut down, SCRAMmed or destroyed, demand above
  0), whatever its own request; it draws nothing for it. Without routing
  the `powered` flag stays; the bridge keeps its backup. A switched-off
  reactor now routes no power (it already generated none).
- `tools/m0.js`: a case whose `run()` throws is recorded as a FAIL (its
  actual value is the error, plus a failing invariant "run() completes in
  every case") instead of stopping the runner. `L1.repair.breach` throws
  under the D kernel (its destroyed cell A is never repaired, so it waits
  for a `cell-repaired` event that never comes); it must stay recorded
  with a FAIL to be withdrawn (#188). Scenarios that do not throw record
  exactly as before.
- Scenarios D1–D5 (`DESIGN.md` §13e.3), written and run for crashes only
  before the lock: `L1.kinetic.damage`, `L1.quarters.repair.v2`,
  `L1.repair.breach.v2`, `L2.shield.salvo`, `L2.lifesupport.routed`, each
  with its expected values from `data.js`, closed forms or its own RK4
  reference integrator (D5). Added beyond the rows: D1 also fires along a
  line of six quarters (18 cells) so every size stops inside it and the
  stopping cell is measured; D2 leaves out the two (c, r) pairs whose repair
  time is a whole number of steps (#185 (2)); D3 adds the v1 heating of the
  wreck; D5 (a) also checks the heat pumped into each neighbour.
- Locked at `49355f3` (only the `locked:` lines), then the first
  canonical run: D1–D4 PASS; **D5 `L2.lifesupport.routed` FAILs** one
  check, the row's 1e-6 K per-second match against its RK4 reference (the
  kernel's Euler error is 2.0e-6 to 5.0e-5 K, as estimated before the
  lock); every other D5 check passes.
- L0, L1 and L2 re-recorded with the new data: every scenario that passed
  still passes except `L1.quarters.repair` and `L1.repair.breach`, now
  withdrawn as superseded by #203 (decision #206) with successors
  `L1.quarters.repair.v2` and `L1.repair.breach.v2`. `regress`:
  44 VERIFIED + 7 WITHDRAWN. `DESIGN.md` §16: the D pass block;
  `MISSION0.md` regenerated.
- Fixes of #212, after merging `main`: D5b `L2.lifesupport.routed.v2`
  (D5 with its (b) per-second match at 1e-6 relative, both directions)
  and D6 `L2.blast.split` (one HE or AP round in an M magazine beside an
  M hold over 10 m and a hold or bridge over 5 m: the 2 : 1 split before
  saturation and the D-pass crew rule for blast), written and run for
  crashes only, locked at `f637d2e`, then run: both PASS.
  `L2.lifesupport.routed` withdrawn under #188 (decision #212, successor
  `L2.lifesupport.routed.v2`). `regress`: 46 VERIFIED + 8 WITHDRAWN.
## 0.3.7 — 2026-10-21 — Magazine explosion wording (#215)

- `DESIGN.md` §5.2: a magazine explodes by the ammunition left; the
  propellant dominates, HE adds about a third (the owner).

## 0.3.6 — 2026-10-21 — Answers to the D-pass physics checker (#214)

- `DESIGN.md` §13e.1: the shield buffer binds at the 6th round within one
  step; E4 for it stays open until L5.

## 0.3.5 — 2026-10-21 — E8's budget (#213)

- `DESIGN.md` §13: E8 is 1 ms per simulation step in Node for a T1 and a
  T6 1v1 (the owner).

## 0.3.4 — 2026-10-21 — Answers to the D-pass engineer (#212)

- `DESIGN.md` §13e.3: D5 withdrawn for a tolerance under the Euler error,
  successor D5b `L2.lifesupport.routed.v2`; new D6 `L2.blast.split`.
- `DESIGN.md` §13f: a destroyed cell resists no round (L3), scenario
  `L3.kinetic.hole`.

## 0.3.3 — 2026-10-21 — The L3 plan (#208–#211)

- `DESIGN.md` §13f: the minimal ship: cell mass from heat capacity, a 2D
  rigid body, thrust, RCS, recoil, debris and fragments with momentum
  conserved, control and SCRAM in a fragment, validation, the readout,
  the reference ship R1 with estimates, 8 scenarios, the L3 constants
  (`engine.thrust` re-tuned to 2 MN), and the E8 budget put to the owner.

## 0.3.2 — 2026-10-21 — Mission 0 L2 merged; reviewer answers (#207)

- L2 (`m0/l2-clusters`, PR #15, head `e40d1af`) merged into `main` after
  the physics checker (#205) and the reviewer (#207) reported no blocking
  finding; `regress`: 42 VERIFIED + 5 WITHDRAWN.
- `DESIGN.md` §13d.1: under power routing a room keeps life support while
  joined through live walls to a reactor able to produce (#207); the ready
  store is `turret.readyRounds` rounds of the turret's own size.
- `DESIGN.md` §13e: the D pass also carries that fix and scenario D5
  `L2.lifesupport.routed` (split by wall length, setpoint clamp, routed
  life support), with estimates.
- `DESIGN.md` §16: the first L2 block is marked superseded by #200 and
  #201 where it states heat numbers of the replaced wall rule.

## 0.3.1 — 2026-10-21 — Heat along the coolant loop, life support, the heat sink (#198, #200, #201)

- Data: `conduction.passive` (25 W/(K·m), 5–100, k=1),
  `lifeSupport.capacityPerCell` (50 kW, 10–200 kW, k=2),
  `FIXED.lifeSupportSetpoint` (295 K), `heatsink.capacityFactor` (5,
  2–10) and `heatsink.conductivityFactor` (3, 1–5), all approved; the
  heat sink room (2×2 M, 3×3 L, anywhere, plant class, no crew, no power);
  every room type is `coolant` (reactor, beam bay, shield generator,
  engine, railgun, heat sink) or `passive`, and crewed rooms and magazines
  carry life support; the hold's 0.1 factor applies on passive walls. No
  cofferdam (deferred, #201 (4)). L0 and L1 re-recorded for the new data
  hash: only `dataHash` and `code` moved.
- `js/heat.js`, `js/rooms.js`: coolant walls (two coolant rooms) keep
  `conduction.wall` with the harmonic mean of coolant factors; every other
  wall is passive. Life support pumps a powered crewed room's or magazine's
  heat above 295 K into its coolant neighbours by live wall length, at most
  the capacity per surviving cell, never below the setpoint within a step;
  the bridge runs it on its backup. Books: `pumped` (part of `conducted`)
  and `vented`; generated + conducted = radiated + vented + stored. A
  destroyed heat sink cell vents (C / n)(T − T_rest) to space (a
  `heat-vented` event), its capacity falls by one cell and T stays; an
  emptied heat sink reads as the rest temperature.
- `tools/m0.js`: a dependency listed in `withdrawn.json` counts through
  its successor (#188), so `L2.reactor.cooled` is not blocked by the
  withdrawn `L2.heat.pair`.
- Seven new L2 scenarios (§13d.2 rows 1b, 2b, 3b, 12b, 13, 14, 16), locked
  before their first canonical run, all PASS. Withdrawn: `L2.heat.chain`
  and `L2.heat.neighbour` (specification errors, #201 (2)), `L2.heat.pair`
  and `L2.bridge.conduction` (superseded by #200).
- `regress`: 42 VERIFIED + 5 WITHDRAWN.

## 0.3.0 — 2026-10-21 — Mission 0 L2: pairs and clusters

- Data (#195): `conduction.wall`, `conduction.holdFactor`,
  `power.wallCapacity`, `ammo.wallFeed`, `turret.readyRounds`,
  `room.blastResistance`, `hold.blastFactor`, all approved; the hold names
  its conductivity and blast factors in `ROOMS`; an L magazine (3×3) for
  `L2.size.rule`. Every L0 and L1 record re-recorded for the new data
  hash: only `dataHash` and `code` moved.
- New `js/layout.js` (grid at the tier's edge, placement and rotation,
  shared walls, open edges, centres) and `js/graph.js` (priority-ordered
  max flow over live walls, ammunition feed into turret ready stores).
- `js/heat.js`: conduction through live walls (harmonic mean of the
  conductivity factors, flows from the start of the step); books carry
  `conducted` for rooms in a cluster.
- `js/rooms.js`: `createWorld({ grid })` makes a cluster; rooms placed with
  `cell` and `rotation`; power routing (`enablePowerRouting`), consumers at
  the fraction they receive; blast between rooms (wave front by wall
  length, `world.blasts`); shield beams at points without double counting
  (`setBeams`, #170) and the impulse buffer with refill (`shieldRound`);
  repair asks scaled to each quarters' budget; the size rule in a cluster.
  A room without a layout behaves exactly as at L1.
- 12 L2 scenarios (§13d.2), locked before their first canonical run:
  10 PASS, `L2.heat.chain` and `L2.heat.neighbour` FAIL on the plan's own
  claims (see `DESIGN.md` §16 and the pull request).
- `regress`: 37 VERIFIED + 1 WITHDRAWN.

## 0.2.2 — 2026-10-21 — L1 reviewer answers #189 landed

- Kernel (`js/rooms.js`, #189 (1)): a room's destroyed count is the cells
  destroyed **now**; a cell stays destroyed from integrity 0 until repair
  brings it back to 1, so a repaired cell no longer counts towards the
  breach test, and crew deaths per destroyed cell use k = cells destroyed
  now, capped by the crew aboard.
- Kernel (#189 (4)): a room that has exploded never melts down or
  explodes again on reaching critical.
- Kernel (#189 (5)): the turret fires on accumulated time, each shot
  inside the step that holds its due time, at that time; the last
  round's draw stops at its due time. `1 + floor(rate t)` holds at e.g.
  `turret.fireRate=1.3`; canonical results unchanged.
- Kernel (#189 (3)): the bridge raises `control-restored` when it gives
  control again; `control-lost` from heat carries the cause `overheat`.
- `tools/m0.js` (#189 (2)): for L1 and later the stripped `locked:` line
  may hold only `locked: null` or the lock object, with an optional
  trailing comma, otherwise the command fails; the lock rule is chosen by
  the scenario's folder, and a `level` that differs from the folder is an
  error. Valid files keep their lock hashes.
- `tools/m0.js` (#189 (6)): `verify`, `regress` and `ledger` check every
  `withdrawn.json` entry (successor exists, locked, recorded PASS;
  decision `#n`). (#189 (7)): the data hash also covers `TIERS` and
  `BASE_EDGE`; every record re-recorded, only `dataHash` and `code` moved.
- New `L1.repair.breach` and `L1.room.restart` (§13c.2 rows 14, 15),
  locked before their first canonical run, both PASS.
- Results: L0 12/12 VERIFIED; L1 15 VERIFIED + 1 WITHDRAWN.

## 0.2.1 — 2026-10-21 — L1 answers #185 and #187 landed

- `tools/m0.js`: the data hash of a record covers `PARAMS`, `FIXED` and
  `ROOMS` (#185 (9)); every L0 and L1 record re-recorded, only `dataHash`
  and `code` moved (criterion, results and run() hashes unchanged).
- `ROOMS.railgun.thermalClass` is `'plant'` (#185 (3)).
- Withdrawn scenarios (#187 (8)): `mission0/withdrawn.json` lists a
  scenario withdrawn for a specification error with its successor and
  decision; `verify` and `regress` report it as WITHDRAWN while it still
  fails exactly as recorded (any other difference is a MISMATCH);
  `regress` includes it; the ledger names the successor. First entry:
  `L1.radiator.steady` → `L1.radiator.steady.v2` (#185).
- New `L1.radiator.steady.v2` (#185 (1)), locked before its first
  canonical run: 22 cases, PASS. No kernel change (`addRoom` already takes
  a start temperature).
- Results: L0 12/12 VERIFIED; L1 13 VERIFIED + 1 WITHDRAWN.
- `DESIGN.md` §16: the v2 numbers, the withdrawal, the 19 one-sided times
  that pass only through the 1e-9 slack, named (the earlier count of
  18 + 5 was wrong), and the #187 (5) signal for L2.

## 0.2.0 — 2026-10-21 — Mission 0 L1: one room alone

- Process items of #184: from L1 the lock hash covers the whole scenario
  file except its `locked:` line (L0 keeps its rule, chosen by level);
  `shield.kineticStop` derived inside `withOverrides`; `blast()` requires
  its coupling (the locked `L0.blast.surface` run now passes 1); the
  `approved` flags of #177 flipped to true.
- `data.js`: the L1 constants of `DESIGN.md` §13c.3 with approved ranges
  (#183), new `FIXED` values (Stefan–Boltzmann, rest temperature,
  radiator emissivity, repair falloff exponent) and a `ROOMS` table.
- Kernel: `js/events.js` (event list, #156 fields), `js/heat.js`
  (per-room heat, radiators by T⁴, thresholds, books), `js/rooms.js` (the
  nine rooms' behaviours); `util.stepsAtLeast` for whole-step timers.
- Thirteen L1 scenarios, locked before their first canonical run: 12 PASS,
  `L1.radiator.steady` FAILs (the room has not settled after 3600 s; a
  design question). The first run also caught a kernel bug (a repaired
  cell reported one step early), fixed and re-run.
- L0 re-run canonically: 12/12 PASS, same criterion and result hashes
  (data hash moved with the new constants).
- `DESIGN.md` §16: the L1 numbers and an honest reading; `README.md`
  constants table regenerated from `data.js`; ledger regenerated.

## 0.1.4 — 2026-10-21 — approval tiers and the L1 plan

- Decision #180: the owner decides direction; the lead designer decides and
  records everything technical, and merges after a clean review.
- Decisions #181–#184 and `DESIGN.md` §13c: the L1 plan (nine rooms, the
  per-room heat model with two threshold classes, 13 scenarios, constants
  with approved ranges, the process items from the L0 v2 review).
- `CLAUDE.md` rules updated for #180; `STATUS.md` hand-over kept current.
- PR #1 (L0) and PR #2 (review roles) merged; nightly regression (#136)
  scheduled.

## 0.1.3 — 2026-10-21 — L0 v2 scenarios

- `he.coupling` in `data.js` (0.5, approved 0.2–0.8, k = 0): the fraction
  of a contact burst's energy that enters the hull (#169, #176).
- `blast()` takes the coupling as an explicit argument (default 1), so the
  locked `L0.blast.surface` run is unaffected; it reports the vented
  energy.
- Five v2 scenarios beside the seven locked L0 scenarios (#176):
  `L0.blast.surface.v2`, `L0.beam.burn.v2`, `L0.kinetic.penetration.v2`,
  `L0.shield.point.v2`, `L0.shield.kinetic.v2`; inputs from `data.js`,
  locked before their first canonical run; all PASS.
- L0 re-run: 12/12 PASS; the seven locked hashes and results are
  unchanged (the data hash moves with the new constant).
- `DESIGN.md` §16: the v2 numbers and an honest reading; `README.md`
  tweakable values include `he.coupling`; ledger regenerated.

## 0.1.2 — 2026-10-20 — L0 review fixes

- `shield.kineticStop` is computed exactly in `data.js` as one S round's
  sectional momentum at T1, with the arithmetic of `projectile.js`; an S
  round is stopped at full strength by definition (#171).
- The simulation step (1/60 s) and the burn time limit (3600 s) move into
  `data.js`; `burnThrough` takes the limit from its caller (#175).
- `tools/m0.js`: records carry `runHash`, a hash of the scenario's
  `run()`; `verify` checks it; the ledger shows it and the unapproved
  constants each verdict depends on (#175).
- `DESIGN.md` §16 corrected: the blast destroys 1 cell and damages 4; the
  shield's full absorption of an M beam is an inference, not a measurement;
  the first independent re-run was the reviewer's; L0's "AP" is the plain
  steel round (#173); the blast criterion does not pin the spreading law.
- `README.md` tweakable values regenerated from `data.js` (S and L size
  factors shown exactly as 2/3 and 3/2).
- L0 re-run: 7/7 PASS, verified; lock hashes unchanged.

## 0.1.1 — 2026-10-20 — review roles

- Decisions #167–#168: four roles (lead designer, engineer, reviewer,
  physics checker), each its own session, handing over through pull
  requests; a retroactive review of L0.
- Role definitions in `.claude/agents/`; `CLAUDE.md` gains a Roles section.

## 0.1.0 — 2026-10-20 — Mission 0, L0 materials

- Decisions #163–#166: SI units, the eight Mission 0 exit criteria, the L0
  plan (sectional-momentum penetration, Gaussian beams) and its ranges.
- `tools/m0.js`: the Mission 0 runner (run, lock, verify, regress, ledger).
  Criteria are hashed and locked; overrides are exploratory and refused
  outside approved ranges; records carry the command that reproduces them.
- Kernel for L0: `js/util.js`, `js/data.js`, `js/projectile.js`,
  `js/damage.js`, `js/field.js`.
- Seven L0 scenarios, locked before their first run; all PASS and verify.
- Measured in `DESIGN.md` §16; constants awaiting approval in §17.

## 0.0.0 — 2026-10-20 — the design

- The design discussion is recorded in `DECISIONS.md` (#1–#162).
- Base documents written from it: `DESIGN.md` (the current design),
  `CLAUDE.md` (working rules), `IDEAS.md` (the idea registry), `README.md`,
  `MISSION0.md` (the empty results ledger).
- No code yet. The next step is Mission 0, level L0, after its exit
  criteria and its approved ranges are agreed (`DESIGN.md` §17).
