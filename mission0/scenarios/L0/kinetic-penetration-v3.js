import { roundGeometry } from '../../../js/projectile.js';
import { penetrateRound } from '../../../js/damage.js';
import { roundStrength } from '../../../js/rooms.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own loop
// lives inside expected().
const CELLS = 10;

export default {
  id: 'L0.kinetic.penetration.v3',
  level: 'L0',
  laws: ['sectional-momentum penetration', 'every interaction is symmetric: the round takes what the cell takes, against its own strength (#228, #230)', 'protection is the mass on the path (#232)', 'square-cube scaling'],
  dependsOn: [],
  setup: 'an AP round of size S, M, L (6 kg x sizeLinear^3 at T1, 800 m/s, a steel cylinder 4 diameters long) at every tier T1-T6 into a column of 10 armour cells (sigma = armour.cellMass / edge^2, 400 kg/m^2 at T1), by the kernel\'s penetrateRound (13i.4 P1)',
  measure: 'continuous depth (cells passed + what the stopping cell took / its r), cells passed, the round\'s damage f, the momentum books',
  tolerance: 'depth relative 1e-9; depth across tiers relative 1e-9; momentum books relative 1e-9; counts exact',
  criterion: 'r = matter.kineticResistance x sigma per cell, S = matter.kineticResistance x rho_steel L; depth, cells passed and f by the round rule of 13i.1 in the scenario\'s own loop (estimates S 1.480, M 2.166, L 3.162, f 0.43-0.45); S, M and L pass 1, 2 and 3 cells; the depth of each size identical T1-T6; p0 = sum of the momentum each cell took + p on exit (#230, #232, #235)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'armour.cellMass'],
  locked: null,
  cases(ctx) {
    const out = [];
    for (const tier of Object.keys(ctx.tiers)) for (const size of ['S', 'M', 'L']) out.push({ tier, size });
    return out;
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
    const edge = ctx.tiers[c.tier].edge, q = round(ctx, c.size, edge), cR = ctx.params.matter.kineticResistance.value;
    const sigma = ctx.scaled(ctx.params.armour.cellMass, edge) / (edge * edge);
    const S = cR * ctx.fixed.steelDensity.value * q.L, own = ownLoop(q.m * q.v, q.A0, S, new Array(CELLS).fill(cR * sigma));
    return { depth: own.depth, passed: own.passed, f: own.f, claim: { S: 1, M: 2, L: 3 }[c.size] };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, k = ctx.params.kinetic, f = ctx.fixed, cR = ctx.params.matter.kineticResistance.value;
    const mass = ctx.scaled(k.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(k.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const rs = new Array(CELLS).fill(cR * (ctx.scaled(ctx.params.armour.cellMass, edge) / (edge * edge)));
    const res = penetrateRound({ momentum: mass * velocity, area: A, strength: roundStrength({ params: ctx.params }, mass, A) }, rs);
    const depth = res.stoppedIn === -1 ? res.passed : res.passed + res.taken[res.stoppedIn] / rs[res.stoppedIn];
    return { depth, passed: res.passed, stoppedIn: res.stoppedIn, f: res.f, wrecked: res.wrecked, p0: mass * velocity, booked: res.impulse.reduce((x, y) => x + y, 0) + res.momentum };
  },
  compare(e, a) {
    const close = (x, y, tol) => Number.isFinite(y) && Math.abs(x - y) <= tol * Math.max(Math.abs(x), Math.abs(y));
    const checks = {
      'depth by the round rule': close(e.depth, a.depth, 1e-9),
      'cells passed': a.passed === e.passed && a.passed === e.claim,
      'damage f': close(e.f, a.f, 1e-9),
      'momentum books': close(a.p0, a.booked, 1e-9),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const close = (x, y) => Math.abs(x - y) <= 1e-9 * Math.max(Math.abs(x), Math.abs(y));
    return [{ name: 'depth of each size identical T1-T6 (1e-9)', ok: ['S', 'M', 'L'].every((size) => { const rs = rows.filter((r) => r.case.size === size), ref = rs.find((r) => r.case.tier === 'T1'); return rs.every((r) => close(ref.actual.depth, r.actual.depth)); }) }];
  },
  display(r) {
    return { expected: `depth ${r.expected.depth.toFixed(9)} cells, passes ${r.expected.passed} (claim ${r.expected.claim}), f ${r.expected.f.toFixed(4)}`, actual: `depth ${r.actual.depth.toFixed(9)} cells, passes ${r.actual.passed}, f ${r.actual.f.toFixed(4)}, books ${((r.actual.booked - r.actual.p0) / r.actual.p0).toExponential(2)}` };
  },
};
