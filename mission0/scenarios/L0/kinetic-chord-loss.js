import { createWorld, addRoom, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// K1 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #273 (b), #278): a passed cell loses chord / kinetic.hitsToWreck of its
// integrity (until L5a a flat 1 / hitsToWreck, §17 items 34, 41); the cell the round stops in loses (taken / r) /
// hitsToWreck as before, r = c sigma chord. An M round (6 kg, 800 m/s) by the kernel's fireRound, off a ship, along a
// column of 12 hold cells (three M holds, 3000 kg cells, sigma = 3000 / 25 = 120 kg/m^2 at T1), every path entry with
// the same chord: 1, 0.9774 (L4.hit.oblique's line), 0.5 and 0.05 (a graze). The L0 lock hashes cases, expected,
// compare and invariants but not helpers (#175), so the scenario's own loop lives inside expected().
//
// Hand-worked (13n.1 (b)): with hitsToWreck = 3 a passed cell loses chord / 3: 1 / 3 = 0.3333, 0.9774 / 3 = 0.3258,
// 0.5 / 3 = 0.1667, 0.05 / 3 = 0.0167 (four digits; the exact quotients at 1e-12). The stopping cell is a
// re-statement: the round rule of 13i.1 in the scenario's own loop (s = p / A against r = c sigma chord, the round
// flattening by r / S, S = c rho_steel L), its loss (taken / r) / 3.
const CELLS = 12;
const CHORDS = [1, 0.9774, 0.5, 0.05];

export default {
  id: 'L0.kinetic.chord.loss',
  level: 'L0',
  laws: ['a passed cell loses chord / kinetic.hitsToWreck of its integrity (#273 (b), 13n.1 (b))', 'the cell a round stops in loses (taken / r) / hitsToWreck, r = c sigma chord (#206, #239)'],
  dependsOn: [],
  setup: 'an M round (kinetic.roundMass, kinetic.muzzleVelocity) into a column of 12 hold cells (three M holds standing alone, 3000 kg cells) by the kernel\'s fireRound off a ship, every path entry with chord 1, 0.9774, 0.5 or 0.05, at T1 (13n.4 K1)',
  measure: 'the loss fireRound reports for each cell reached, each cell\'s integrity after the round, the cells passed and the cell it stops in',
  tolerance: 'closed form against the kernel 1e-12 relative (13k.4 conventions); the four-digit hand-worked literals 5e-5 absolute',
  criterion: 'each passed cell loses chord / kinetic.hitsToWreck (the exact quotient at 1e-12; hand-worked 0.3333, 0.3258, 0.1667, 0.0167 at 5e-5) and is left at 1 minus that; the cells passed and the stopping cell by the round rule (re-statement, the scenario\'s own loop), the stopping cell losing (taken / r) / hitsToWreck at 1e-12; a cell the round does not reach loses nothing',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'structure.cellMass', 'kinetic.hitsToWreck'],
  locked: null,
  cases() {
    return CHORDS.map((chord) => ({ chord }));
  },
  expected(ctx, c) {
    const p = ctx.params, fx = ctx.fixed, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const cR = p.matter.kineticResistance.value, r = cR * (p.structure.cellMass.value / 25) * c.chord, S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D;
    let pm = m * v, f = 0, A = A0, passed = CELLS, stoppedIn = -1, stopLoss = null;
    for (let i = 0; i < CELLS; i++) {
      const s = pm / A;
      if (s > r && f + r / S < 1) { pm -= r * A; f += r / S; A = A0 / (1 - f); continue; }
      passed = i; stoppedIn = i; stopLoss = Math.min(s, r) / r / p.kinetic.hitsToWreck.value;
      break;
    }
    const hand = { 1: 0.3333, 0.9774: 0.3258, 0.5: 0.1667, 0.05: 0.0167 }[c.chord];
    return { passLoss: c.chord / p.kinetic.hitsToWreck.value, hand, passed, stoppedIn, stopLoss };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt }), p = ctx.params, fx = ctx.fixed;
    const rooms = [1, 2, 3].map((i) => addRoom(world, 'hold', { id: `hold-${i}` }));
    const path = rooms.flatMap((room) => [0, 1, 2, 3].map((cell) => ({ room, cell, chord: c.chord })));
    const m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value, { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
    const res = fireRound(world, { mass: m, velocity: v, area: A }, path, 'round-1');
    return { passed: res.passed, stoppedIn: res.stoppedIn, losses: res.losses, integrity: path.map((x) => x.room.cells[x.cell].integrity) };
  },
  compare(e, a) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    const passedLosses = a.losses.slice(0, a.passed), passedIntegrity = a.integrity.slice(0, a.passed);
    const beyond = a.stoppedIn < 0 ? [] : a.integrity.slice(a.stoppedIn + 1);
    const checks = {
      'cells passed and the stopping cell by the round rule (re-statement)': a.passed === e.passed && a.stoppedIn === e.stoppedIn,
      'a passed cell loses chord / hitsToWreck (1e-12)': passedLosses.length > 0 && passedLosses.every((x) => close(e.passLoss, x, 1e-12)),
      'hand-worked loss (5e-5)': passedLosses.every((x) => Math.abs(x - e.hand) <= 5e-5),
      'a passed cell is left at 1 - chord / hitsToWreck (1e-12)': passedIntegrity.every((x) => close(1 - e.passLoss, x, 1e-12)),
      'the stopping cell loses (taken / r) / hitsToWreck (1e-12)': e.stoppedIn < 0 || close(e.stopLoss, a.losses[a.stoppedIn], 1e-12),
      'a cell not reached loses nothing': beyond.every((x) => x === 1),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return { expected: `passed cells lose ${e.passLoss.toFixed(12)} (${e.hand}); ${e.passed} passed, stops in ${e.stoppedIn}${e.stopLoss !== null ? `, loses ${e.stopLoss.toFixed(12)}` : ''}`, actual: `losses ${a.losses.map((x) => x.toFixed(6)).join(' ')}; ${a.passed} passed, stops in ${a.stoppedIn}` };
  },
};
