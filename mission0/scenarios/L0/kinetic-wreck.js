import { roundGeometry } from '../../../js/projectile.js';
import { penetrateRound } from '../../../js/damage.js';
import { roundStrength } from '../../../js/rooms.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own loop
// lives inside expected(). Within the approved ranges a steel round is never wrecked (f <= v / c, 13i.3), so the
// wreck is tested on the pure function with a weaker round: a function test, not a data override (13i.4 P3).
const WEAK = 0.3; // the round's strength as a fraction of a steel round's S
const CELLS = 6;

export default {
  id: 'L0.kinetic.wreck',
  level: 'L0',
  laws: ['every interaction is symmetric: a round is damaged against its own strength and wrecked at f = 1 (#228, #230)'],
  dependsOn: ['L0.kinetic.penetration.v3'],
  setup: 'penetrateRound called with a round strength of 0.3 S (S = matter.kineticResistance x rho_steel L of the steel round) for AP rounds of size S, M, L (6 kg x sizeLinear^3 at T1, 800 m/s, steel cylinders 4 diameters long) into a column of 6 armour cells (sigma = armour.cellMass / edge^2), at T1 and T6 (13i.4 P3)',
  measure: 'the stopping cell, whether it is wrecked (f = 1), what the stopping cell took, f, the momentum books',
  tolerance: 'taken and f relative 1e-9 (f = 1 exactly when wrecked); momentum books relative 1e-9; counts exact',
  criterion: 'by the round rule of 13i.1 in the scenario\'s own loop: the round stops in the cell the loop names, wrecked (f = 1) exactly where the loop says (at the base values S is wrecked in cell 1 and M in cell 2; L stops in cell 3 with f about 0.95, not wrecked), the stopping cell takes min(s, r) with s the sectional momentum on entry, f capped at 1; identical at T1 and T6; p0 = sum of the momentum each cell took + p on exit (#230)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'matter.kineticResistance', 'armour.cellMass'],
  locked: null,
  cases() {
    const out = [];
    for (const tier of ['T1', 'T6']) for (const size of ['S', 'M', 'L']) out.push({ tier, size });
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
    const sigma = ctx.scaled(ctx.params.armour.cellMass, edge) / (edge * edge), r = cR * sigma;
    const own = ownLoop(q.m * q.v, q.A0, 0.3 * cR * ctx.fixed.steelDensity.value * q.L, new Array(6).fill(r));
    // The sectional momentum on entry to the stopping cell, from the loop's own books.
    let p = q.m * q.v, f = 0;
    for (let i = 0; i < own.passed; i++) { p -= own.impulse[i]; f += own.taken[i] / (0.3 * cR * ctx.fixed.steelDensity.value * q.L); }
    const sIn = (p * (1 - f)) / q.A0;
    return { stoppedIn: own.stoppedIn, wrecked: own.f === 1, f: own.f, taken: Math.min(sIn, r), claim: { S: 0, M: 1, L: 2 }[c.size] };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge, k = ctx.params.kinetic, f = ctx.fixed, cR = ctx.params.matter.kineticResistance.value;
    const mass = ctx.scaled(k.roundMass, edge) * f.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(k.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, f.steelDensity.value, f.roundLengthToDiameter.value);
    const rs = new Array(CELLS).fill(cR * (ctx.scaled(ctx.params.armour.cellMass, edge) / (edge * edge)));
    const res = penetrateRound({ momentum: mass * velocity, area: A, strength: WEAK * roundStrength({ params: ctx.params }, mass, A) }, rs);
    return { stoppedIn: res.stoppedIn, wrecked: res.wrecked, f: res.f, taken: res.stoppedIn >= 0 ? res.taken[res.stoppedIn] : null, p0: mass * velocity, booked: res.impulse.reduce((x, y) => x + y, 0) + res.momentum };
  },
  compare(e, a) {
    const close = (x, y, tol) => Number.isFinite(y) && Math.abs(x - y) <= tol * Math.max(Math.abs(x), Math.abs(y));
    const checks = {
      'stopping cell': a.stoppedIn === e.stoppedIn && a.stoppedIn === e.claim,
      'wrecked where the loop says (f = 1)': a.wrecked === e.wrecked && (a.f === 1) === e.wrecked,
      'damage f': close(e.f, a.f, 1e-9),
      'the stopping cell takes min(s, r)': close(e.taken, a.taken, 1e-9),
      'momentum books': close(a.p0, a.booked, 1e-9),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    return [{ name: 'identical at T1 and T6 (stopping cell and wreck)', ok: ['S', 'M', 'L'].every((size) => {
      const t1 = rows.find((r) => r.case.size === size && r.case.tier === 'T1').actual, t6 = rows.find((r) => r.case.size === size && r.case.tier === 'T6').actual;
      return t1.stoppedIn === t6.stoppedIn && t1.wrecked === t6.wrecked;
    }) }];
  },
  display(r) {
    const f = (x) => `stops in cell ${x.stoppedIn + 1}${x.wrecked ? ', wrecked' : ''}, f ${x.f.toFixed(6)}, taken ${x.taken.toExponential(6)}`;
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
