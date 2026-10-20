import { roundGeometry, sectionalMomentum } from '../../../js/projectile.js';
import { penetrate } from '../../../js/damage.js';

export default {
  id: 'L0.kinetic.overpen',
  level: 'L0',
  laws: ['over-penetration'],
  dependsOn: ['L0.kinetic.penetration'],
  setup: 'an AP M round at T1 through an ordinary room n cells deep, with vacuum behind it',
  measure: 'fraction of the sectional momentum wasted by leaving the ship',
  tolerance: 'relative 1e-9',
  criterion: 'wasted = max(0, 1 - n * Rroom / s0) (#9: over-penetration loses the remaining momentum)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'room.kineticResistance'],
  locked: { date: '2026-10-20', hash: '810e8a2c' },
  cases() {
    return [1, 2, 4, 8, 12].map((n) => ({ cells: n }));
  },
  expected(ctx, c) {
    const k = ctx.params.kinetic;
    const m = k.roundMass.value, v = k.muzzleVelocity.value;
    const D = Math.cbrt((4 * m) / (Math.PI * ctx.fixed.steelDensity.value * ctx.fixed.roundLengthToDiameter.value));
    const s0 = (m * v) / ((Math.PI * D * D) / 4);
    return { wasted: Math.max(0, 1 - (c.cells * ctx.params.room.kineticResistance.value) / s0) };
  },
  run(ctx, c) {
    const k = ctx.params.kinetic;
    const mass = ctx.scaled(k.roundMass), velocity = ctx.scaled(k.muzzleVelocity);
    const { A } = roundGeometry(mass, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
    const s0 = sectionalMomentum(mass, velocity, A);
    const r = penetrate(s0, new Array(c.cells).fill(ctx.scaled(ctx.params.room.kineticResistance)));
    return { wasted: r.residual / s0, exited: r.stoppedIn === -1 };
  },
  compare(e, a) {
    return { pass: Math.abs(e.wasted - a.wasted) <= 1e-9 * Math.max(1, e.wasted) };
  },
  invariants(ctx, rows) {
    const consistent = rows.every((r) => (r.actual.wasted > 0) === r.actual.exited);
    return [{ name: 'momentum is wasted exactly when the round leaves the ship', ok: consistent }];
  },
  display(r) {
    return { expected: `wasted ${(r.expected.wasted * 100).toFixed(2)}%`, actual: `wasted ${(r.actual.wasted * 100).toFixed(2)}%${r.actual.exited ? ', exits' : ', stops inside'}` };
  },
};
