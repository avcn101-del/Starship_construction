# Changelog

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
