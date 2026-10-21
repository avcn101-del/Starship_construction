import { beamDeliveredFraction } from '../../../js/field.js';
import { burnThrough } from '../../../js/damage.js';

export default {
  id: 'L0.beam.burn',
  level: 'L0',
  laws: ['beam heats what it hits', 'energy conservation'],
  dependsOn: ['L0.beam.falloff'],
  setup: 'an M beam at T1 held on one armour cell at 0 to 1500 m, stepped at 1/60 s',
  measure: 'time to burn through the cell; heat put into the target room',
  tolerance: 'time within one step (1/60 s); heat relative 1e-9',
  criterion: 't = Q / (P f(d)) with the closed-form f(d); every joule delivered becomes heat in the target room (#138)',
  tunable: ['beam.power', 'beam.focusRange', 'armour.burnEnergy'],
  locked: { date: '2026-10-20', hash: '908664be' },
  cases() {
    return [0, 300, 600, 1000, 1500].map((d) => ({ d }));
  },
  expected(ctx, c) {
    const a = ctx.baseEdge / 2, w0 = a * ctx.fixed.beamWaistPerHalfCell.value, zR = ctx.params.beam.focusRange.value;
    const f = 1 - Math.exp((-2 * a * a) / (w0 * w0 * (1 + (c.d / zR) ** 2)));
    return { time: ctx.params.armour.burnEnergy.value / (ctx.params.beam.power.value * f) };
  },
  run(ctx, c) {
    const zR = ctx.scaled(ctx.params.beam.focusRange), a = ctx.baseEdge / 2;
    const f = beamDeliveredFraction(c.d, zR, a, a * ctx.fixed.beamWaistPerHalfCell.value);
    const r = burnThrough(ctx.scaled(ctx.params.beam.power) * f, ctx.scaled(ctx.params.armour.burnEnergy), ctx.dt, ctx.fixed.burnTimeLimit.value);
    return { time: r.time, delivered: r.delivered, heat: r.heat, burnt: r.burnt };
  },
  compare(e, a, c, ctx) {
    return { pass: a.burnt && Math.abs(a.time - e.time) <= ctx.dt + 1e-9 * e.time };
  },
  invariants(ctx, rows) {
    return [{ name: 'heat in the target room = energy delivered', ok: rows.every((r) => Math.abs(r.actual.heat - r.actual.delivered) <= 1e-9 * r.actual.delivered) }];
  },
  display(r) {
    return { expected: `${r.expected.time.toFixed(3)} s`, actual: `${r.actual.time.toFixed(3)} s, heat ${(r.actual.heat / 1e6).toFixed(2)} MJ` };
  },
};
