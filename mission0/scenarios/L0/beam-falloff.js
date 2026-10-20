import { beamDeliveredFraction } from '../../../js/field.js';

export default {
  id: 'L0.beam.falloff',
  level: 'L0',
  laws: ['inverse-square (Gaussian beam)'],
  dependsOn: [],
  setup: 'a Gaussian beam at T1 on a target aperture of half a cell, at distances from 0 to 20 focus ranges',
  measure: 'fraction of the beam power delivered into the aperture',
  tolerance: 'relative 1e-6 against the closed form',
  criterion: 'f(d) = 1 - exp(-2 a^2 / w(d)^2), w(d) = w0 sqrt(1 + (d / zR)^2); nearly flat within the focus range (f(zR/4) >= 0.98 f(0)); 1/d^2 beyond it (d^2 f(d) at 10 zR within 3% of 20 zR) (#165)',
  tunable: ['beam.focusRange'],
  locked: { date: '2026-10-20', hash: 'b45fa911' },
  cases() {
    return [0, 0.25, 0.5, 1, 2, 5, 10, 20].map((x) => ({ x }));
  },
  expected(ctx, c) {
    const a = ctx.baseEdge / 2, w0 = a * ctx.fixed.beamWaistPerHalfCell.value;
    const w2 = w0 * w0 * (1 + c.x * c.x);
    return { fraction: 1 - Math.exp((-2 * a * a) / w2) };
  },
  run(ctx, c) {
    const zR = ctx.scaled(ctx.params.beam.focusRange);
    const a = ctx.baseEdge / 2;
    return { fraction: beamDeliveredFraction(c.x * zR, zR, a, a * ctx.fixed.beamWaistPerHalfCell.value), distance: c.x * zR };
  },
  compare(e, a) {
    return { pass: Math.abs(e.fraction - a.fraction) <= 1e-6 * e.fraction };
  },
  invariants(ctx, rows) {
    const f = (x) => rows.find((r) => r.case.x === x).actual.fraction;
    const flat = f(0.25) >= 0.98 * f(0);
    const r10 = 100 * f(10), r20 = 400 * f(20);
    return [
      { name: 'flat within the focus range', ok: flat, detail: `f(zR/4) / f(0) = ${(f(0.25) / f(0)).toFixed(4)}` },
      { name: 'inverse-square beyond it', ok: Math.abs(r10 / r20 - 1) <= 0.03, detail: `d^2 f at 10 zR / at 20 zR = ${(r10 / r20).toFixed(4)}` },
    ];
  },
  display(r) {
    return { expected: `f ${r.expected.fraction.toFixed(6)}`, actual: `f ${r.actual.fraction.toFixed(6)} at ${r.actual.distance.toFixed(0)} m` };
  },
};
