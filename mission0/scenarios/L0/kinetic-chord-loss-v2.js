import { createWorld, addRoom, fireRound } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// Successor of L0.kinetic.chord.loss (withdrawn under #282 (7) (b), the physics checker's D4 on PR #73): every case and
// check of the original, plus two cases on a column of 16 hold cells (four M holds standing alone, no drydock grid, so
// the 30 x 14 grid does not bound it), where chord 0.5 stops inside the column and chord 0.05 is an exit case.
//
// K1 of the L5 plan (DESIGN.md 13n.4, 13n.1 (b), #273 (b), #278): a passed cell loses chord / kinetic.hitsToWreck of its
// integrity (until L5a a flat 1 / hitsToWreck, §17 items 34, 41); the cell the round stops in loses (taken / r) /
// hitsToWreck as before, r = c sigma chord. An M round (6 kg, 800 m/s) by the kernel's fireRound, off a ship, along a
// column of 12 hold cells (three M holds, 3000 kg cells, sigma = 3000 / 25 = 120 kg/m^2 at T1), every path entry with
// the same chord: 1, 0.9774 (L4.hit.oblique's line), 0.5 and 0.05 (a graze); and along 16 cells with chords 0.5 and
// 0.05. The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own loop
// lives inside expected().
//
// Hand-worked (13n.1 (b)): with hitsToWreck = 3 a passed cell loses chord / 3: 1 / 3 = 0.3333, 0.9774 / 3 = 0.3258,
// 0.5 / 3 = 0.1667, 0.05 / 3 = 0.0167 (four digits; the exact quotients at 1e-12). The stopping cell is a
// re-statement: the round rule of 13i.1 in the scenario's own loop (s = p / A against r = c sigma chord, the round
// flattening by r / S, S = c rho_steel L), its loss (taken / r) / 3.
//
// Hand-worked, the 16-cell column (13i.1, by the formula, not from a printed value): D = (4 m / (pi rho_steel 4))^(1/3)
// = (24 / (pi 7850 4))^(1/3) = 0.062428 m, A0 = pi D^2 / 4 = 3.06087e-3 m^2, L = 4 D; c = 2.7e5 x 12^(1/3) / 400 =
// 1545.364 m/s; S = c rho_steel L = 1545.364 x 7850 x 0.249711 = 3.02927e6. A round that has passed i cells has
// flattened by f_i = i r / S, its area A_i = A0 / (1 - f_i), its momentum p_i = m v - r A0 sum_{j<i} 1 / (1 - j r / S);
// it passes cell i while p_i / A_i > r.
// - chord 0.5: r = 1545.364 x 120 x 0.5 = 92721.85 kg/(m s), r / S = 0.0306087. p_13 = 4800 - 92721.85 x 3.06087e-3
//   x sum_{j<13} 1 / (1 - 0.0306087 j) = 188.24 kg m/s, A_13 = A0 / (1 - 0.397913) = 5.08380e-3 m^2, s_13 = 37028
//   < r: the round passes cells 0..12 (13 passed) and stops in cell 13 (the 14th), which loses (s_13 / r) / 3 =
//   (37028 / 92722) / 3 = 0.1331.
// - chord 0.05: r = 9272.185, r / S = 0.00306087; s_i stays above r through i = 15 (it first falls under r at i = 132),
//   so the round passes all 16 cells and leaves with p_16 = 4800 - 9272.185 x 3.06087e-3 x sum_{j<16} 1 / (1 -
//   0.00306087 j) = 4335.14 kg m/s, exit speed p_16 / m = 722.52 m/s.
//
// Comment slips noted under #282 (7) (d), in locked files of the same pass (left unchanged; no successor is made for a
// comment): L2.magazine.detonation (K2): "s after the hold, 1.383e6" divides by the pristine A0; with the flattening
// it is 1.298e6 (s after the hold over A0 / (1 - f)). L4.kill.v3 (K3): 604.64 N s is 604.63; R1d's two hold cells fall to shot-4
// (kernel-read), not to a no-repair count's shot-3, because R1d's quarters repair the damaged holds (about +0.13 per 2 s).
// L4.books.energy (B3): the work is the integrator's own change of kinetic energy; thrust is not independently checked.

export default {
  id: 'L0.kinetic.chord.loss.v2',
  level: 'L0',
  laws: ['a passed cell loses chord / kinetic.hitsToWreck of its integrity (#273 (b), 13n.1 (b))', 'the cell a round stops in loses (taken / r) / hitsToWreck, r = c sigma chord (#206, #239)'],
  dependsOn: [],
  setup: 'an M round (kinetic.roundMass, kinetic.muzzleVelocity) into a column of 12 hold cells (three M holds standing alone, 3000 kg cells) by the kernel\'s fireRound off a ship, every path entry with chord 1, 0.9774, 0.5 or 0.05, at T1 (13n.4 K1); and a column of 16 hold cells (four M holds, no grid) with chord 0.5 (stops inside) and 0.05 (exits) (#282 (7) (b))',
  measure: 'the loss fireRound reports for each cell reached, each cell\'s integrity after the round, the cells passed and the cell it stops in, the exit speed (momentum left / m) when it passes every cell',
  tolerance: 'closed form against the kernel 1e-12 relative (13k.4 conventions); the four-digit hand-worked literals 5e-5 absolute',
  criterion: 'each passed cell loses chord / kinetic.hitsToWreck (the exact quotient at 1e-12; hand-worked 0.3333, 0.3258, 0.1667, 0.0167 at 5e-5) and is left at 1 minus that; the cells passed and the stopping cell by the round rule (re-statement, the scenario\'s own loop), the stopping cell losing (taken / r) / hitsToWreck at 1e-12; a cell the round does not reach loses nothing; (16 cells) chord 0.5 passes 13 cells and stops in cell 13, which loses 0.1331 (hand-worked, 5e-5), chord 0.05 passes all 16 and exits at 722.52 m/s (hand-worked, 0.01 m/s) and at the round rule\'s speed (1e-12)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'structure.cellMass', 'kinetic.hitsToWreck'],
  locked: { date: '2026-10-22', hash: '69aa0831' },
    cases() {
    return [...[1, 0.9774, 0.5, 0.05].map((chord) => ({ chord, cells: 12 })), { chord: 0.5, cells: 16 }, { chord: 0.05, cells: 16 }];
  },
  expected(ctx, c) {
    const p = ctx.params, fx = ctx.fixed, m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value;
    const D = Math.cbrt((4 * m) / (Math.PI * fx.steelDensity.value * fx.roundLengthToDiameter.value)), A0 = (Math.PI * D * D) / 4;
    const cR = p.matter.kineticResistance.value, r = cR * (p.structure.cellMass.value / 25) * c.chord, S = cR * fx.steelDensity.value * fx.roundLengthToDiameter.value * D;
    let pm = m * v, f = 0, A = A0, passed = c.cells, stoppedIn = -1, stopLoss = null;
    for (let i = 0; i < c.cells; i++) {
      const s = pm / A;
      if (s > r && f + r / S < 1) { pm -= r * A; f += r / S; A = A0 / (1 - f); continue; }
      passed = i; stoppedIn = i; stopLoss = Math.min(s, r) / r / p.kinetic.hitsToWreck.value;
      break;
    }
    const hand = { 1: 0.3333, 0.9774: 0.3258, 0.5: 0.1667, 0.05: 0.0167 }[c.chord];
    // The 16-cell column's hand-worked literals (header): chord 0.5 stops in cell 13 losing 0.1331; chord 0.05 exits at 722.52 m/s.
    const hand16 = c.cells !== 16 ? null : c.chord === 0.5 ? { passed: 13, stoppedIn: 13, stopLoss: 0.1331 } : { passed: 16, stoppedIn: -1, exit: 722.52 };
    return { passLoss: c.chord / p.kinetic.hitsToWreck.value, hand, passed, stoppedIn, stopLoss, exit: stoppedIn < 0 ? pm / m : null, hand16 };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, edge: 5, dt: ctx.dt }), p = ctx.params, fx = ctx.fixed;
    const rooms = Array.from({ length: c.cells / 4 }, (_, i) => i + 1).map((i) => addRoom(world, 'hold', { id: `hold-${i}` }));
    const path = rooms.flatMap((room) => [0, 1, 2, 3].map((cell) => ({ room, cell, chord: c.chord })));
    const m = p.kinetic.roundMass.value, v = p.kinetic.muzzleVelocity.value, { A } = roundGeometry(m, fx.steelDensity.value, fx.roundLengthToDiameter.value);
    const res = fireRound(world, { mass: m, velocity: v, area: A }, path, 'round-1');
    return { passed: res.passed, stoppedIn: res.stoppedIn, exit: res.momentum / m, losses: res.losses, integrity: path.map((x) => x.room.cells[x.cell].integrity) };
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
    if (e.hand16) {
      const h = e.hand16;
      checks['hand-worked cells passed and stopping cell (16 cells)'] = a.passed === h.passed && a.stoppedIn === h.stoppedIn;
      if (h.stopLoss !== undefined) checks['hand-worked stopping loss 0.1331 (5e-5)'] = a.stoppedIn >= 0 && Math.abs(a.losses[a.stoppedIn] - h.stopLoss) <= 5e-5;
      else {
        checks['exit speed by the round rule (1e-12)'] = e.exit !== null && close(e.exit, a.exit, 1e-12);
        checks['hand-worked exit speed 722.52 m/s (0.01)'] = Math.abs(a.exit - h.exit) <= 0.01;
      }
    }
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    const e = r.expected, a = r.actual;
    return { expected: `passed cells lose ${e.passLoss.toFixed(12)} (${e.hand}); ${e.passed} passed, stops in ${e.stoppedIn}${e.stopLoss !== null ? `, loses ${e.stopLoss.toFixed(12)}` : ''}${e.exit !== null ? `, exits at ${e.exit.toFixed(9)} m/s` : ''}`, actual: `losses ${a.losses.map((x) => x.toFixed(6)).join(' ')}; ${a.passed} passed, stops in ${a.stoppedIn}${a.stoppedIn < 0 ? `, exits at ${a.exit.toFixed(9)} m/s` : ''}` };
  },
};
