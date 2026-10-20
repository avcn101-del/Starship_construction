import { roundGeometry, sectionalMomentum } from '../../../js/projectile.js';
import { penetrate } from '../../../js/damage.js';

export default {
  id: 'L0.kinetic.penetration',
  level: 'L0',
  laws: ['sectional-momentum penetration', 'square-cube scaling'],
  dependsOn: [],
  setup: 'an AP round of size S, M, L at every tier T1-T6 fired into a plate 10 armour cells thick',
  measure: 'cells the round passes through before it stops',
  tolerance: 'exact (a whole number of cells)',
  criterion: 'passed = ceil(s0 / R) - 1, where s0 = m v / (pi D^2 / 4) and R is the armour resistance per cell; the same size passes the same number of cells at every tier (#165); sectional momentum in = absorbed + residual',
  tunable: ['kinetic.roundMass', 'kinetic.muzzleVelocity', 'armour.kineticResistance'],
  locked: { date: '2026-10-20', hash: '8228497c' },
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
    const R = a.value * e ** a.k;
    return { passed: Math.min(10, Math.ceil(s0 / R) - 1) };
  },
  run(ctx, c) {
    const edge = ctx.tiers[c.tier].edge;
    const k = ctx.params.kinetic;
    const mass = ctx.scaled(k.roundMass, edge) * ctx.fixed.sizeLinear.value[c.size] ** 3;
    const velocity = ctx.scaled(k.muzzleVelocity, edge);
    const { A } = roundGeometry(mass, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
    const s0 = sectionalMomentum(mass, velocity, A);
    const R = ctx.scaled(ctx.params.armour.kineticResistance, edge);
    const r = penetrate(s0, new Array(10).fill(R));
    return { passed: r.passed, s0, absorbedSum: r.absorbed.reduce((x, y) => x + y, 0), residual: r.residual };
  },
  compare(e, a) {
    return { pass: e.passed === a.passed };
  },
  invariants(ctx, rows) {
    const books = rows.every((r) => Math.abs(r.actual.s0 - r.actual.absorbedSum - r.actual.residual) <= 1e-9 * r.actual.s0);
    const bySize = {};
    for (const r of rows) (bySize[r.case.size] ||= new Set()).add(r.actual.passed);
    const same = Object.values(bySize).every((set) => set.size === 1);
    return [
      { name: 'sectional momentum in = absorbed + residual', ok: books },
      { name: 'same size, same penetration at every tier', ok: same, detail: Object.entries(bySize).map(([k, v]) => `${k}: ${[...v].join('/')}`).join(', ') },
    ];
  },
  display(r) {
    return { expected: `${r.expected.passed} cells`, actual: `${r.actual.passed} cells (s0 ${r.actual.s0.toExponential(3)})` };
  },
};
