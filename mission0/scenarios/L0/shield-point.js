import { shieldStrength, absorbBeamStep } from '../../../js/field.js';

export default {
  id: 'L0.shield.point',
  level: 'L0',
  laws: ['finite field budget with falloff', 'absorbed energy becomes heat'],
  dependsOn: [],
  setup: 'a continuous beam of 2, 10 or 30 MW for 10 s at a point 0 to 160 m from an M shield generator (T1), stepped at 1/60 s; continuous beams meet the rate, the buffer is for impulses',
  measure: 'energy absorbed, energy passed through, heat in the generator',
  tolerance: 'relative 1e-9',
  criterion: 'absorbed = min(P, B g(r)) t with g(r) = 1 / (1 + (r / radius)^2); passed = P t - absorbed; heat = absorbed (#21, #99)',
  tunable: ['shield.budget', 'shield.radius'],
  locked: { date: '2026-10-20', hash: 'd83b6f9a' },
  cases() {
    const out = [];
    for (const r of [0, 20, 40, 80, 160]) for (const P of [2e6, 1e7, 3e7]) out.push({ r, P });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.params.shield;
    const g = 1 / (1 + (c.r / s.radius.value) ** ctx.fixed.shieldFalloffExponent.value);
    const absorbed = Math.min(c.P, s.budget.value * g) * 10;
    return { absorbed, passed: c.P * 10 - absorbed };
  },
  run(ctx, c) {
    const s = ctx.params.shield;
    const g = shieldStrength(c.r, ctx.scaled(s.radius), ctx.fixed.shieldFalloffExponent.value);
    const steps = Math.round(10 / ctx.dt);
    let absorbed = 0, passed = 0, heat = 0;
    for (let i = 0; i < steps; i++) {
      const st = absorbBeamStep(c.P, ctx.dt, ctx.scaled(s.budget), g);
      absorbed += st.absorbed; passed += st.passed; heat += st.heat;
    }
    return { absorbed, passed, heat, input: c.P * steps * ctx.dt };
  },
  compare(e, a) {
    const tol = 1e-9 * a.input;
    return { pass: Math.abs(e.absorbed - a.absorbed) <= tol && Math.abs(e.passed - a.passed) <= tol };
  },
  invariants(ctx, rows) {
    return [
      { name: 'energy in = absorbed + passed', ok: rows.every((r) => Math.abs(r.actual.input - r.actual.absorbed - r.actual.passed) <= 1e-9 * r.actual.input) },
      { name: 'heat = absorbed', ok: rows.every((r) => r.actual.heat === r.actual.absorbed) },
    ];
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(2);
    return { expected: `absorbed ${mj(r.expected.absorbed)} MJ, passed ${mj(r.expected.passed)} MJ`, actual: `absorbed ${mj(r.actual.absorbed)} MJ, passed ${mj(r.actual.passed)} MJ` };
  },
};
