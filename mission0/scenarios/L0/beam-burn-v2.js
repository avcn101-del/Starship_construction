import { beamDeliveredFraction } from '../../../js/field.js';
import { burnThrough } from '../../../js/damage.js';

export default {
  id: 'L0.beam.burn.v2',
  level: 'L0',
  laws: ['beam heats what it hits', 'energy conservation'],
  dependsOn: ['L0.beam.falloff'],
  setup: 'an M beam at T1 held on one armour cell at 0, 0.25, 0.5, 1, 1.5 and 2.5 focus ranges, stepped at the simulation step',
  measure: 'time to burn through the cell; heat put into the target room',
  tolerance: 'one-sided: none beyond one step',
  criterion: 'with t = Q / (P f(d)) and the closed-form f(d): t <= actual time < t + dt; heat >= Q and heat - Q < P f(d) dt (#138, #176)',
  tunable: ['beam.power', 'beam.focusRange', 'armour.burnEnergy'],
  locked: null,
  cases(ctx) {
    const zR = ctx.params.beam.focusRange.value;
    return [0, 0.25, 0.5, 1, 1.5, 2.5].map((ranges) => ({ d: ranges * zR }));
  },
  expected(ctx, c) {
    const a = ctx.baseEdge / 2, w0 = a * ctx.fixed.beamWaistPerHalfCell.value, zR = ctx.params.beam.focusRange.value;
    const f = 1 - Math.exp((-2 * a * a) / (w0 * w0 * (1 + (c.d / zR) ** 2)));
    const P = ctx.params.beam.power.value * f, Q = ctx.params.armour.burnEnergy.value, dt = ctx.fixed.simStep.value;
    return { time: Q / P, dt, burnEnergy: Q, stepEnergy: P * dt };
  },
  run(ctx, c) {
    const zR = ctx.scaled(ctx.params.beam.focusRange), a = ctx.baseEdge / 2;
    const f = beamDeliveredFraction(c.d, zR, a, a * ctx.fixed.beamWaistPerHalfCell.value);
    const r = burnThrough(ctx.scaled(ctx.params.beam.power) * f, ctx.scaled(ctx.params.armour.burnEnergy), ctx.dt, ctx.fixed.burnTimeLimit.value);
    return { time: r.time, heat: r.heat, burnt: r.burnt };
  },
  compare(e, a) {
    const time = a.burnt && e.time <= a.time && a.time < e.time + e.dt;
    const heat = a.heat >= e.burnEnergy && a.heat - e.burnEnergy < e.stepEnergy;
    return { pass: time && heat, note: [!time && 'time', !heat && 'heat'].filter(Boolean).join(', ') };
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(4) + ' MJ';
    return {
      expected: `${r.expected.time.toFixed(4)} s <= t < ${(r.expected.time + r.expected.dt).toFixed(4)} s; ${mj(r.expected.burnEnergy)} <= heat < ${mj(r.expected.burnEnergy + r.expected.stepEnergy)}`,
      actual: `${r.actual.time.toFixed(4)} s, heat ${mj(r.actual.heat)}`,
    };
  },
};
