import { roundGeometry, sectionalMomentum } from '../../../js/projectile.js';
import { penetrate } from '../../../js/damage.js';

export default {
  id: 'L0.kinetic.penetration.v2',
  level: 'L0',
  laws: ['sectional-momentum penetration', 'square-cube scaling'],
  dependsOn: [],
  setup: 'an AP round of size S, M, L at every tier T1-T6 fired into a plate 10 armour cells thick',
  measure: 'continuous penetration depth in cells: the sum over the path of what each cell absorbed divided by its resistance',
  tolerance: 'relative 1e-9',
  criterion: 'depth = s0 / R, where s0 = m v / (pi D^2 / 4) and R is the armour resistance per cell, at every tier and size (#165, #176)',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'armour.kineticResistance'],
  locked: null,
  cases(ctx) {
    const out = [];
    for (const tier of Object.keys(ctx.tiers)) for (const size of ['S', 'M', 'L']) out.push({ tier, size });
    return out;
  },
  expected(ctx, c) {
    const e = ctx.tiers[c.tier].edge / ctx.baseEdge;
    const k = ctx.params.kinetic, a = ctx.params.armour.kineticResistance;
    const m = k.roundMass.value * e ** k.roundMass.k * ctx.fixed.sizeLinear.value[c.size] ** 3;
    const v = k.muzzleVelocity.value * e ** k.muzzleVelocity.k;
    const D = Math.cbrt((4 * m) / (Math.PI * ctx.fixed.steelDensity.value * ctx.fixed.roundLengthToDiameter.value));
    const s0 = (m * v) / ((Math.PI * D * D) / 4);
    return { depth: s0 / (a.value * e ** a.k) };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge;
    const k = ctx.params.kinetic;
    const mass = ctx.scaled(k.roundMass, edge) * ctx.fixed.sizeLinear.value[c.size] ** 3;
    const velocity = ctx.scaled(k.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
    const s0 = sectionalMomentum(mass, velocity, A);
    const resistances = new Array(10).fill(ctx.scaled(ctx.params.armour.kineticResistance, edge));
    const r = penetrate(s0, resistances);
    return { depth: r.absorbed.reduce((sum, x, i) => sum + x / resistances[i], 0) };
  },
  compare(e, a) {
    return { pass: Math.abs(a.depth - e.depth) <= 1e-9 * e.depth };
  },
  display(r) {
    return { expected: `${r.expected.depth.toFixed(9)} cells`, actual: `${r.actual.depth.toFixed(9)} cells` };
  },
};
