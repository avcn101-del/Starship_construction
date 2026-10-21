import { roundGeometry } from '../../../js/projectile.js';
import { penetrateRound } from '../../../js/damage.js';
import { roundStrength } from '../../../js/rooms.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own loop
// lives inside expected().

export default {
  id: 'L0.kinetic.overpen.v2',
  level: 'L0',
  laws: ['over-penetration', 'every interaction is symmetric (#228, #230)', 'protection is the mass on the path (#232)'],
  dependsOn: ['L0.kinetic.penetration.v3'],
  setup: 'an AP M round at T1 (6 kg, 800 m/s, a steel cylinder 4 diameters long) through n = 1, 2, 3, 4 empty hold cells (sigma = structure.cellMass / edge^2, 120 kg/m^2) with vacuum behind, by the kernel\'s penetrateRound (13i.4 P2)',
  measure: 'momentum on exit / p0; whether it exits; the momentum books',
  tolerance: 'relative 1e-9',
  criterion: 'r = matter.kineticResistance x sigma, S = matter.kineticResistance x rho_steel L; p on exit / p0 by the round rule of 13i.1 in the scenario\'s own loop (estimates 0.882 / 0.756 / 0.621 / 0.476); the round exits in every case; p0 = sum of the momentum each cell took + p on exit (#230, #232, #235)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'structure.cellMass'],
  locked: { date: '2026-10-21', hash: '8d466bea' },
  cases() {
    return [1, 2, 3, 4].map((n) => ({ cells: n }));
  },
  expected(ctx, c) {
    // The round rule written out (13i.1), independent of the kernel: s = p / A on entry; it passes if s > r and
    // f + r / S < 1 (the cell takes r, p falls by r A, f grows by r / S, A = A0 / (1 - f)); otherwise it stops there,
    // the cell takes min(s, r) and f grows by that / S, capped at 1. Returns the depth in cells (passed + taken / r at
    // the stop), what each cell took and the books.
    function ownLoop(p0, A0, S, rs) {
      let p = p0, f = 0, A = A0;
      const taken = [], impulse = [];
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i], s = p / A;
        if (s > r && f + r / S < 1) { taken.push(r); impulse.push(r * A); p -= r * A; f += r / S; A = A0 / (1 - f); continue; }
        const t = Math.min(s, r);
        f = Math.min(1, f + t / S);
        taken.push(t); impulse.push(p);
        return { passed: i, stoppedIn: i, depth: i + t / r, f, exit: 0, taken, impulse };
      }
      return { passed: rs.length, stoppedIn: -1, depth: rs.length, f, exit: p, taken, impulse };
    }
    // An AP round of `size` at `edge` from data.js: mass m, velocity v, a steel cylinder 4 diameters long.
    function round(ctx, size, edge) {
      const k = ctx.params.kinetic, f = ctx.fixed;
      const m = ctx.scaled(k.roundMass, edge) * f.sizeLinear.value[size] ** 3, v = ctx.scaled(k.muzzleVelocity, edge);
      const D = Math.cbrt((4 * m) / (Math.PI * f.steelDensity.value * f.roundLengthToDiameter.value));
      return { m, v, A0: (Math.PI * D * D) / 4, L: f.roundLengthToDiameter.value * D };
    }
    const edge = ctx.baseEdge, q = round(ctx, 'M', edge), cR = ctx.params.matter.kineticResistance.value;
    const sigma = ctx.scaled(ctx.params.structure.cellMass, edge) / (edge * edge);
    const own = ownLoop(q.m * q.v, q.A0, cR * ctx.fixed.steelDensity.value * q.L, new Array(c.cells).fill(cR * sigma));
    return { kept: own.exit / (q.m * q.v), exits: own.stoppedIn === -1 };
  },
  run(ctx, c) {
    const k = ctx.params.kinetic, f = ctx.fixed, edge = ctx.baseEdge, cR = ctx.params.matter.kineticResistance.value;
    const mass = ctx.scaled(k.roundMass, edge), velocity = ctx.scaled(k.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const rs = new Array(c.cells).fill(cR * (ctx.scaled(ctx.params.structure.cellMass, edge) / (edge * edge)));
    const res = penetrateRound({ momentum: mass * velocity, area: A, strength: roundStrength({ params: ctx.params }, mass, A) }, rs);
    return { kept: res.momentum / (mass * velocity), exits: res.stoppedIn === -1, f: res.f, p0: mass * velocity, booked: res.impulse.reduce((x, y) => x + y, 0) + res.momentum };
  },
  compare(e, a) {
    const close = (x, y, tol) => Number.isFinite(y) && Math.abs(x - y) <= tol * Math.max(Math.abs(x), Math.abs(y));
    const checks = { 'p on exit / p0 by the round rule': close(e.kept, a.kept, 1e-9), 'exits': e.exits && a.exits, 'momentum books': close(a.p0, a.booked, 1e-9) };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    return [{ name: 'the momentum kept falls with every cell crossed', ok: rows.every((r, i) => i === 0 || r.actual.kept < rows[i - 1].actual.kept) }];
  },
  display(r) {
    return { expected: `keeps ${r.expected.kept.toFixed(9)} of p0${r.expected.exits ? ', exits' : ''}`, actual: `keeps ${r.actual.kept.toFixed(9)} of p0${r.actual.exits ? ', exits' : ', stops'}; f ${r.actual.f.toFixed(4)}` };
  },
};
