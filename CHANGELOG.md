# Changelog

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
