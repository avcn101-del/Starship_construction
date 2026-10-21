import { shieldStrength, absorbBeamStep } from '../../../js/field.js';

// Measurement window (s): how long each beam is held, not a game constant.
const WINDOW = 10;

export default {
  id: 'L0.shield.point.v2',
  level: 'L0',
  laws: ['finite field budget with falloff'],
  dependsOn: [],
  setup: 'a continuous beam of 0.5x, 1x, 2x and 6x the M beam (beam.power) for 10 s at a point 0, 0.5, 1, 2 and 4 shield radii from an M shield generator (T1), stepped at the simulation step',
  measure: 'energy absorbed and energy passed through',
  tolerance: 'relative 1e-9',
  criterion: 'absorbed = min(P, B g(r)) t with g(r) = 1 / (1 + (r / radius)^2); passed = P t - absorbed (#99, #176); no heat invariant (#174)',
  tunable: ['shield.budget', 'shield.radius', 'beam.power'],
  locked: { date: '2026-10-21', hash: '48511feb' },
  cases(ctx) {
    const radius = ctx.params.shield.radius.value, power = ctx.params.beam.power.value;
    const out = [];
    for (const radii of [0, 0.5, 1, 2, 4]) for (const times of [0.5, 1, 2, 6]) out.push({ r: radii * radius, P: times * power, times });
    return out;
  },
  expected(ctx, c) {
    const s = ctx.params.shield;
    const g = 1 / (1 + (c.r / s.radius.value) ** ctx.fixed.shieldFalloffExponent.value);
    const absorbed = Math.min(c.P, s.budget.value * g) * WINDOW;
    return { absorbed, passed: c.P * WINDOW - absorbed };
  },
  run(ctx, c) {
    const s = ctx.params.shield;
    const g = shieldStrength(c.r, ctx.scaled(s.radius), ctx.fixed.shieldFalloffExponent.value);
    const steps = Math.round(WINDOW / ctx.dt);
    let absorbed = 0, passed = 0;
    for (let i = 0; i < steps; i++) {
      const st = absorbBeamStep(c.P, ctx.dt, ctx.scaled(s.budget), g);
      absorbed += st.absorbed; passed += st.passed;
    }
    return { absorbed, passed, input: c.P * steps * ctx.dt };
  },
  compare(e, a) {
    const tol = 1e-9 * a.input;
    return { pass: Math.abs(e.absorbed - a.absorbed) <= tol && Math.abs(e.passed - a.passed) <= tol };
  },
  invariants(ctx, rows) {
    return [
      { name: 'energy in = absorbed + passed', ok: rows.every((r) => Math.abs(r.actual.input - r.actual.absorbed - r.actual.passed) <= 1e-9 * r.actual.input) },
    ];
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(2);
    return { expected: `absorbed ${mj(r.expected.absorbed)} MJ, passed ${mj(r.expected.passed)} MJ`, actual: `absorbed ${mj(r.actual.absorbed)} MJ, passed ${mj(r.actual.passed)} MJ` };
  },
};
